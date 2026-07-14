import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScanContext } from './types.js';

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
]);

/**
 * Specific relative paths to skip rather than whole directory names — e.g.
 * `.yarn/` itself holds legitimate config (`.yarnrc.yml`, `.yarn/plugins`)
 * alongside huge generated content that must not be blanket-excluded by name.
 */
const SKIP_RELATIVE_PATHS = new Set(['.yarn/cache', '.yarn/unplugged', '.yarn/install-state.gz']);

const MAX_DEPTH = 10;
const MAX_FILES = 20000;
/** Never read file bodies larger than this (binary/artifact protection). */
const MAX_READ_BYTES = 512 * 1024;

function safeRealpath(p: string): string | null {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

function walk(root: string): { files: string[]; truncated: boolean } {
  const files: string[] = [];
  let truncated = false;
  const visitedRealDirs = new Set<string>([safeRealpath(root) ?? root]);
  const stack: Array<{ abs: string; rel: string; depth: number }> = [{ abs: root, rel: '', depth: 0 }];

  outer: while (stack.length > 0) {
    const dir = stack.pop()!;
    if (dir.depth > MAX_DEPTH) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir.abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const rel = dir.rel === '' ? entry.name : `${dir.rel}/${entry.name}`;
      if (SKIP_RELATIVE_PATHS.has(rel)) continue;

      const abs = path.join(dir.abs, entry.name);
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();

      if (entry.isSymbolicLink()) {
        let stat: fs.Stats;
        try {
          stat = fs.statSync(abs); // follows the symlink, unlike lstatSync
        } catch {
          continue; // broken symlink target
        }
        isDir = stat.isDirectory();
        isFile = stat.isFile();
      }

      if (isDir) {
        if (SKIP_DIRS.has(entry.name)) continue;
        // Dedup by real path so symlink cycles (and hardlink-style repeats)
        // can't loop forever; readdirSync/statSync below still follow the
        // symlink transparently via its own (non-resolved) `abs` path.
        const real = safeRealpath(abs) ?? abs;
        if (visitedRealDirs.has(real)) continue;
        visitedRealDirs.add(real);
        stack.push({ abs, rel, depth: dir.depth + 1 });
      } else if (isFile) {
        if (files.length >= MAX_FILES) {
          truncated = true;
          break outer;
        }
        files.push(rel);
      }
    }
  }
  files.sort();
  return { files, truncated };
}

export function createScanContext(rootInput: string): ScanContext {
  const root = path.resolve(rootInput);
  const { files, truncated } = walk(root);
  const fileSet = new Set(files);
  const contentCache = new Map<string, string | null>();
  // `files` is fixed once the walk completes, so matching(re) is a pure
  // function of re's source+flags — several checks re-query the exact same
  // pattern (e.g. every CTX-* rule check matches RULE_RE independently),
  // and this cache turns those repeats into a single filter() per pattern.
  const matchCache = new Map<string, string[]>();

  return {
    root,
    files,
    truncated,
    has(relPath: string): boolean {
      return fileSet.has(relPath);
    },
    read(relPath: string): string | null {
      if (contentCache.has(relPath)) return contentCache.get(relPath)!;
      let content: string | null = null;
      if (fileSet.has(relPath)) {
        try {
          const abs = path.join(root, relPath);
          const stat = fs.statSync(abs);
          if (stat.size <= MAX_READ_BYTES) {
            content = fs.readFileSync(abs, 'utf8');
          }
        } catch {
          content = null;
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
