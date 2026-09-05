import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScanContext, ScanIncompleteReason } from './types.js';
import { compareLexically } from './util.js';

/** Directories that never contain harness signal and can be huge. */
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.tox',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  '.idea',
  '.nx',
  '.pnp',
  '.parcel-cache',
  '.angular',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.devbox',
]);

/**
 * Specific relative paths to skip rather than whole directory names — e.g.
 * `.yarn/` itself holds legitimate config (`.yarnrc.yml`, `.yarn/plugins`)
 * alongside huge generated content that must not be blanket-excluded by name.
 */
const SKIP_RELATIVE_PATHS = new Set(['.yarn/cache', '.yarn/unplugged', '.yarn/install-state.gz']);

/** Emergency fuse against pathological repositories; normal scans should complete well below it. */
const MAX_FILES = 1_000_000;
/** Never read file bodies larger than this (binary/artifact protection). */
const MAX_READ_BYTES = 512 * 1024;

export interface ScanOverlay {
  label: string;
  /** Repo-relative path → absolute path for reading (repo wins on conflict). */
  files: Map<string, string>;
  truncated?: boolean;
  incompleteReasons?: ScanIncompleteReason[];
}

export interface CreateScanOptions {
  overlays?: ScanOverlay[];
}

function safeRealpath(p: string): string | null {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

interface WalkOptions {
  maxDepth?: number;
  maxFiles?: number;
  readDirectory?: (directory: string) => fs.Dirent[];
  statPath?: (path: string) => fs.Stats;
}

interface PendingDirectory {
  abs: string;
  rel: string;
  depth: number;
  real: string;
}

export interface WalkResult {
  files: string[];
  truncated: boolean;
  incompleteReasons: ScanIncompleteReason[];
}

function addFirstReason(reasons: ScanIncompleteReason[], reason: ScanIncompleteReason): void {
  if (!reasons.some((existing) => existing.code === reason.code)) reasons.push(reason);
}

function isMissingOrBrokenSymlink(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP';
}

function isInsideRoot(rootReal: string, targetReal: string): boolean {
  const relative = path.relative(rootReal, targetReal);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

/** Internal/testable deterministic filesystem walker. `maxDepth` is a test seam only. */
export function walkDirectory(root: string, options: WalkOptions = {}): WalkResult {
  const maxDepth = options.maxDepth;
  const maxFiles = options.maxFiles ?? MAX_FILES;
  const readDirectory =
    options.readDirectory ?? ((directory: string) => fs.readdirSync(directory, { withFileTypes: true }));
  const statPath = options.statPath ?? fs.statSync;
  const files: string[] = [];
  const incompleteReasons: ScanIncompleteReason[] = [];
  const rootReal = safeRealpath(root) ?? path.resolve(root);
  const visitedRealDirs = new Set<string>();
  const stack: PendingDirectory[] = [{ abs: root, rel: '', depth: 0, real: rootReal }];
  const deferredSymlinkDirs: PendingDirectory[] = [];

  while (stack.length > 0 || deferredSymlinkDirs.length > 0) {
    // Exhaust physical directories before aliases so a lexically earlier
    // symlink cannot hide the canonical repository path for the same target.
    const dir = stack.pop() ?? deferredSymlinkDirs.pop()!;
    if (visitedRealDirs.has(dir.real)) continue;
    visitedRealDirs.add(dir.real);

    let entries: fs.Dirent[];
    try {
      entries = readDirectory(dir.abs);
    } catch {
      addFirstReason(incompleteReasons, {
        code: 'unreadable-directory',
        path: dir.rel || '.',
      });
      continue;
    }
    entries.sort((a, b) => compareLexically(a.name, b.name));
    const childDirs: PendingDirectory[] = [];
    const childSymlinkDirs: PendingDirectory[] = [];
    for (const entry of entries) {
      const rel = dir.rel === '' ? entry.name : `${dir.rel}/${entry.name}`;
      if (
        SKIP_RELATIVE_PATHS.has(rel) ||
        (SKIP_DIRS.has(entry.name) && (entry.isDirectory() || entry.isSymbolicLink()))
      ) {
        continue;
      }

      const abs = path.join(dir.abs, entry.name);
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();
      let symlinkReal: string | null = null;

      if (entry.isSymbolicLink()) {
        let stat: fs.Stats;
        try {
          stat = statPath(abs); // follows the symlink, unlike lstatSync
        } catch (error) {
          if (!isMissingOrBrokenSymlink(error)) {
            addFirstReason(incompleteReasons, { code: 'unreadable-path', path: rel });
          }
          continue;
        }
        symlinkReal = safeRealpath(abs);
        if (symlinkReal === null) {
          addFirstReason(incompleteReasons, { code: 'unreadable-path', path: rel });
          continue;
        }
        if (!isInsideRoot(rootReal, symlinkReal)) {
          addFirstReason(incompleteReasons, { code: 'outside-root-symlink', path: rel });
          continue;
        }
        isDir = stat.isDirectory();
        isFile = stat.isFile();
      }

      if (isDir) {
        if (maxDepth !== undefined && dir.depth >= maxDepth) {
          addFirstReason(incompleteReasons, { code: 'depth-limit', path: rel, limit: maxDepth });
          continue;
        }
        const real = symlinkReal ?? safeRealpath(abs) ?? abs;
        const child = { abs, rel, depth: dir.depth + 1, real };
        if (entry.isSymbolicLink()) {
          childSymlinkDirs.push(child);
        } else {
          childDirs.push(child);
        }
      } else if (isFile) {
        if (files.length >= maxFiles) {
          addFirstReason(incompleteReasons, {
            code: 'file-count-limit',
            path: rel,
            limit: maxFiles,
          });
          files.sort(compareLexically);
          return { files, truncated: true, incompleteReasons };
        }
        files.push(rel);
      }
    }
    for (let i = childDirs.length - 1; i >= 0; i -= 1) stack.push(childDirs[i]!);
    for (let i = childSymlinkDirs.length - 1; i >= 0; i -= 1) {
      deferredSymlinkDirs.push(childSymlinkDirs[i]!);
    }
  }
  files.sort(compareLexically);
  return { files, truncated: incompleteReasons.length > 0, incompleteReasons };
}

function normalizeReasons(
  truncated: boolean,
  reasons: ScanIncompleteReason[] | undefined,
): ScanIncompleteReason[] {
  const normalized: ScanIncompleteReason[] = [];
  for (const reason of reasons ?? []) addFirstReason(normalized, reason);
  if (truncated && normalized.length === 0) {
    normalized.push({ code: 'file-count-limit' });
  }
  return normalized;
}

function buildContext(
  root: string,
  repoFiles: string[],
  incompleteReasons: ScanIncompleteReason[],
  overlayAbsByRel: Map<string, string>,
  overlayLabelByRel: Map<string, string>,
): ScanContext {
  const repoSet = new Set(repoFiles);
  const fileSet = new Set(repoFiles);
  for (const rel of overlayAbsByRel.keys()) {
    if (!fileSet.has(rel)) fileSet.add(rel);
  }
  const files = [...fileSet].sort();
  const contentCache = new Map<string, string | null>();
  const matchCache = new Map<string, string[]>();

  return {
    root,
    files,
    get truncated(): boolean {
      return incompleteReasons.length > 0;
    },
    incompleteReasons,
    has(relPath: string): boolean {
      return fileSet.has(relPath);
    },
    read(relPath: string): string | null {
      if (contentCache.has(relPath)) return contentCache.get(relPath)!;
      let content: string | null = null;
      let abs: string | null = null;
      if (repoSet.has(relPath)) {
        abs = path.join(root, relPath);
      } else {
        abs = overlayAbsByRel.get(relPath) ?? null;
      }
      if (abs) {
        try {
          const stat = fs.statSync(abs);
          if (stat.size <= MAX_READ_BYTES) {
            content = fs.readFileSync(abs, 'utf8');
          }
        } catch {
          content = null;
          addFirstReason(incompleteReasons, {
            code: 'unreadable-path',
            path: repoSet.has(relPath)
              ? relPath
              : `${overlayLabelByRel.get(relPath) ?? 'overlay'}:${relPath}`,
          });
        }
      }
      contentCache.set(relPath, content);
      return content;
    },
    matching(re: RegExp): string[] {
      const key = re.toString();
      const cached = matchCache.get(key);
      if (cached) return cached;
      const result = files.filter((f) => re.test(f));
      matchCache.set(key, result);
      return result;
    },
  };
}

export function createScanContext(rootInput: string, options: CreateScanOptions = {}): ScanContext {
  const root = path.resolve(rootInput);
  const { files: repoFiles, truncated: repoTruncated, incompleteReasons: repoReasons } = walkDirectory(root);
  const overlays = options.overlays ?? [];

  const overlayAbsByRel = new Map<string, string>();
  const overlayLabelByRel = new Map<string, string>();
  const effectiveReasons = normalizeReasons(repoTruncated, repoReasons);
  const repoSet = new Set(repoFiles);

  for (const overlay of overlays) {
    for (const reason of normalizeReasons(overlay.truncated === true, overlay.incompleteReasons)) {
      addFirstReason(effectiveReasons, {
        ...reason,
        path: reason.path ? `${overlay.label}:${reason.path}` : undefined,
      });
    }
    for (const [rel, abs] of overlay.files) {
      if (repoSet.has(rel)) continue;
      overlayAbsByRel.set(rel, abs);
      overlayLabelByRel.set(rel, overlay.label);
    }
  }

  if (overlays.length === 0) {
    return buildContext(root, repoFiles, effectiveReasons, overlayAbsByRel, overlayLabelByRel);
  }

  return buildContext(root, repoFiles, effectiveReasons, overlayAbsByRel, overlayLabelByRel);
}
