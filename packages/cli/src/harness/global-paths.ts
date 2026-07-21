import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ExtraRootEntry } from '../config.js';
import type { ScanOverlay } from '../scan.js';
import { PATH_SPECS } from './registry.js';

const OVERLAY_MAX_DEPTH = 8;
const OVERLAY_MAX_FILES = 5000;

/** Repo-relative paths that may appear under user/system/extra harness trees. */
function isHarnessRelPath(relPath: string): boolean {
  if (PATH_SPECS.some((spec) => spec.pathRegex.test(relPath))) return true;
  if (relPath === 'AGENTS.md' || relPath === 'CLAUDE.md' || relPath === 'GEMINI.md') return true;
  if (relPath === '.cursorrules' || relPath === '.mcp.json') return true;
  return false;
}

function toPosixRel(rel: string): string {
  return rel.split(path.sep).join('/');
}

function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function collectDir(
  absDir: string,
  relPrefix: string,
  files: Map<string, string>,
  depth = 0,
): { truncated: boolean } {
  let truncated = false;
  if (depth > OVERLAY_MAX_DEPTH) return { truncated };
  const stat = safeStat(absDir);
  if (!stat?.isDirectory()) return { truncated };

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return { truncated };
  }

  for (const entry of entries) {
    if (files.size >= OVERLAY_MAX_FILES) {
      truncated = true;
      break;
    }
    const abs = path.join(absDir, entry.name);
    const rel = relPrefix === '' ? entry.name : `${relPrefix}/${entry.name}`;
    const relPosix = toPosixRel(rel);

    if (entry.isDirectory()) {
      const sub = collectDir(abs, relPosix, files, depth + 1);
      if (sub.truncated) truncated = true;
    } else if (entry.isFile()) {
      if (isHarnessRelPath(relPosix)) {
        files.set(relPosix, abs);
      }
    }
  }
  return { truncated };
}

/** Map flat files in a directory to a repo-relative prefix (e.g. Cline global rules). */
function collectShallowDir(
  absDir: string,
  relPrefix: string,
  files: Map<string, string>,
): { truncated: boolean } {
  let truncated = false;
  const stat = safeStat(absDir);
  if (!stat?.isDirectory()) return { truncated };

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return { truncated };
  }

  for (const entry of entries) {
    if (files.size >= OVERLAY_MAX_FILES) {
      truncated = true;
      break;
    }
    if (!entry.isFile()) continue;
    const relPosix = toPosixRel(`${relPrefix}/${entry.name}`);
    if (isHarnessRelPath(relPosix)) {
      files.set(relPosix, path.join(absDir, entry.name));
    }
  }
  return { truncated };
}

function collectFile(absFile: string, relPath: string, files: Map<string, string>): void {
  const stat = safeStat(absFile);
  if (stat?.isFile() && isHarnessRelPath(relPath)) {
    files.set(relPath, absFile);
  }
}

function userHome(): string {
  return os.homedir();
}

function xdgConfigHome(): string {
  const env = process.env.XDG_CONFIG_HOME;
  if (env && env.length > 0) return env;
  return path.join(userHome(), '.config');
}

/** Cross-platform Documents folder (Cline global rules/hooks). */
function documentsPath(home: string): string {
  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE ?? home, 'Documents');
  }
  return path.join(home, 'Documents');
}

/**
 * Physical user-level directories walked with a fixed repo-relative prefix.
 * Only paths whose layout matches PATH_SPECS are included in the overlay.
 */
function userHarnessDirs(home: string, xdg: string): Array<[string, string]> {
  return [
    // Cursor
    [path.join(home, '.cursor', 'skills'), '.cursor/skills'],
    [path.join(home, '.cursor', 'commands'), '.cursor/commands'],
    [path.join(home, '.cursor', 'agents'), '.cursor/agents'],
    [path.join(home, '.cursor', 'rules'), '.cursor/rules'],
    // Claude Code
    [path.join(home, '.claude', 'skills'), '.claude/skills'],
    [path.join(home, '.claude', 'commands'), '.claude/commands'],
    [path.join(home, '.claude', 'agents'), '.claude/agents'],
    // Codex / Antigravity skills (shared .agents/skills layout)
    [path.join(home, '.codex', 'skills'), '.agents/skills'],
    [path.join(home, '.agents', 'skills'), '.agents/skills'],
    [path.join(home, '.agents', 'rules'), '.agents/rules'],
    [path.join(home, '.agent', 'rules'), '.agent/rules'],
    [path.join(home, '.gemini', 'rules'), '.gemini/rules'],
    [path.join(home, '.agents', 'workflows'), '.agents/workflows'],
    [path.join(home, '.agent', 'workflows'), '.agent/workflows'],
    // Windsurf (repo-layout under home when present)
    [path.join(home, '.windsurf', 'rules'), '.windsurf/rules'],
    [path.join(home, '.windsurf', 'workflows'), '.windsurf/workflows'],
    // Continue
    [path.join(home, '.continue', 'rules'), '.continue/rules'],
    [path.join(home, '.continue', 'prompts'), '.continue/prompts'],
    // Zed
    [path.join(home, '.zed', 'commands'), '.zed/commands'],
    // OpenCode
    [path.join(xdg, 'opencode', 'agents'), '.opencode/agents'],
  ];
}

/**
 * Single files whose on-disk location differs from the repo-relative path
 * the scanner checks (alias mapping for effective score parity).
 */
function userHarnessFileAliases(home: string): Array<[string, string]> {
  return [
    [path.join(home, '.cursor', 'mcp.json'), '.cursor/mcp.json'],
    [path.join(home, '.claude', 'settings.json'), '.claude/settings.json'],
    [path.join(home, '.mcp.json'), '.mcp.json'],
    [path.join(home, '.junie', 'AGENTS.md'), 'AGENTS.md'],
    [path.join(home, '.agents', 'AGENTS.md'), 'AGENTS.md'],
    [path.join(home, '.codex', 'AGENTS.md'), 'AGENTS.md'],
    // Windsurf global rules live under Codeium, not .windsurf/rules/
    [
      path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md'),
      '.windsurf/rules/global_rules.md',
    ],
    [path.join(home, '.codeium', 'windsurf', 'mcp_config.json'), '.agents/mcp_config.json'],
  ];
}

/** Cline global rules directories (OS-specific Documents paths). */
function clineGlobalRulesDirs(home: string): string[] {
  const docs = documentsPath(home);
  return [path.join(docs, 'Cline', 'Rules'), path.join(home, 'Cline', 'Rules')];
}

/** Walk an extra root and collect harness-shaped relative paths. */
function collectExtraRoot(absRoot: string, files: Map<string, string>): { truncated: boolean } {
  let truncated = false;
  const stat = safeStat(absRoot);
  if (!stat) return { truncated };

  if (stat.isFile()) {
    const rel = toPosixRel(path.basename(absRoot));
    if (isHarnessRelPath(rel)) files.set(rel, absRoot);
    return { truncated };
  }

  if (stat.isDirectory()) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absRoot, { withFileTypes: true });
    } catch {
      return { truncated };
    }
    for (const entry of entries) {
      if (files.size >= OVERLAY_MAX_FILES) {
        truncated = true;
        break;
      }
      const abs = path.join(absRoot, entry.name);
      const relPosix = toPosixRel(entry.name);
      if (entry.isDirectory()) {
        const sub = collectDir(abs, relPosix, files, 1);
        if (sub.truncated) truncated = true;
      } else if (entry.isFile() && isHarnessRelPath(relPosix)) {
        files.set(relPosix, abs);
      }
    }
  }
  return { truncated };
}

function overlayFromMap(label: string, files: Map<string, string>, truncated: boolean): ScanOverlay | null {
  if (files.size === 0) return null;
  return { label, files, truncated };
}

/** User-level harness locations (OS-aware, allowlisted only). */
export function buildUserOverlay(): ScanOverlay | null {
  const home = userHome();
  const xdg = xdgConfigHome();
  const files = new Map<string, string>();
  let truncated = false;

  for (const [absDir, relPrefix] of userHarnessDirs(home, xdg)) {
    const result = collectDir(absDir, relPrefix, files);
    if (result.truncated) truncated = true;
  }

  for (const dir of clineGlobalRulesDirs(home)) {
    const result = collectShallowDir(dir, '.clinerules', files);
    if (result.truncated) truncated = true;
  }

  for (const [abs, rel] of userHarnessFileAliases(home)) {
    collectFile(abs, rel, files);
  }

  return overlayFromMap('user', files, truncated);
}

/** System-level harness locations (minimal v1 — expand when paths are validated). */
export function buildSystemOverlay(): ScanOverlay | null {
  // Reserved for shared/system-wide harness installs; empty until validated per OS.
  return null;
}

export function buildExtraRootOverlay(repoRoot: string, entry: ExtraRootEntry): ScanOverlay | null {
  const absRoot = path.resolve(repoRoot, entry.path);
  const files = new Map<string, string>();
  const { truncated } = collectExtraRoot(absRoot, files);
  return overlayFromMap(entry.id, files, truncated);
}

export interface ResolvedOverlayRoots {
  overlays: ScanOverlay[];
  resolvedRoots: Array<{ scope: string; absPath: string }>;
}

/** Build all overlays for the resolved scan configuration. */
export function buildOverlays(
  repoRoot: string,
  scopes: { user: boolean; system: boolean },
  extraRoots: ExtraRootEntry[],
): ResolvedOverlayRoots {
  const overlays: ScanOverlay[] = [];
  const resolvedRoots: ResolvedOverlayRoots['resolvedRoots'] = [];

  if (scopes.user) {
    const overlay = buildUserOverlay();
    if (overlay) {
      overlays.push(overlay);
      resolvedRoots.push({ scope: 'user', absPath: userHome() });
    }
  }

  if (scopes.system) {
    const overlay = buildSystemOverlay();
    if (overlay) {
      overlays.push(overlay);
      resolvedRoots.push({ scope: 'system', absPath: '/etc' });
    }
  }

  for (const entry of extraRoots) {
    const absRoot = path.resolve(repoRoot, entry.path);
    const overlay = buildExtraRootOverlay(repoRoot, entry);
    if (overlay) {
      overlays.push(overlay);
      resolvedRoots.push({ scope: entry.id, absPath: absRoot });
    }
  }

  return { overlays, resolvedRoots };
}
