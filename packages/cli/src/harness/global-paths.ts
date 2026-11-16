import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ExtraRootEntry } from '../config.js';
import type { ScanOverlay } from '../scan.js';
import type { ScanIncompleteReason } from '../types.js';
import { compareLexically, safeJsonParse } from '../util.js';
import {
  claudePluginsRegistryPath,
  collectClaudePluginInstall,
  parseInstalledPluginsRegistry,
  readClaudeEnabledPlugins,
  shouldIncludeInstalledPlugin,
} from './plugins.js';
import { PATH_SPECS, TOOL_DETECTION_PATHS } from './registry.js';

const OVERLAY_MAX_DEPTH = 8;
const OVERLAY_MAX_FILES = 5000;

interface CollectionResult {
  incompleteReasons: ScanIncompleteReason[];
}

function addFirstReason(reasons: ScanIncompleteReason[], reason: ScanIncompleteReason): void {
  if (!reasons.some((entry) => entry.code === reason.code)) reasons.push(reason);
}

function mergeReasons(target: ScanIncompleteReason[], source: ScanIncompleteReason[]): void {
  for (const reason of source) addFirstReason(target, reason);
}

/** Repo-relative paths that may appear under user/system/extra harness trees. */
function isHarnessRelPath(relPath: string): boolean {
  if (PATH_SPECS.some((spec) => spec.pathRegex.test(relPath))) return true;
  if (
    Object.values(TOOL_DETECTION_PATHS).some((patterns) => patterns?.some((pattern) => pattern.test(relPath)))
  ) {
    return true;
  }
  if (['AGENTS.md', 'AGENT.md', 'AGENTS.local.md', 'CLAUDE.md', 'GEMINI.md'].includes(relPath)) return true;
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
): CollectionResult {
  const incompleteReasons: ScanIncompleteReason[] = [];
  const stat = safeStat(absDir);
  if (!stat?.isDirectory()) return { incompleteReasons };

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    addFirstReason(incompleteReasons, {
      code: 'unreadable-directory',
      path: relPrefix || '.',
    });
    return { incompleteReasons };
  }
  entries.sort((a, b) => compareLexically(a.name, b.name));

  for (const entry of entries) {
    if (files.size >= OVERLAY_MAX_FILES) {
      addFirstReason(incompleteReasons, {
        code: 'file-count-limit',
        path: relPrefix === '' ? entry.name : `${relPrefix}/${entry.name}`,
        limit: OVERLAY_MAX_FILES,
      });
      break;
    }
    const abs = path.join(absDir, entry.name);
    const rel = relPrefix === '' ? entry.name : `${relPrefix}/${entry.name}`;
    const relPosix = toPosixRel(rel);

    if (entry.isDirectory()) {
      if (depth >= OVERLAY_MAX_DEPTH) {
        addFirstReason(incompleteReasons, {
          code: 'depth-limit',
          path: relPosix,
          limit: OVERLAY_MAX_DEPTH,
        });
        continue;
      }
      const sub = collectDir(abs, relPosix, files, depth + 1);
      mergeReasons(incompleteReasons, sub.incompleteReasons);
    } else if (entry.isFile()) {
      if (isHarnessRelPath(relPosix)) {
        files.set(relPosix, abs);
      }
    }
  }
  return { incompleteReasons };
}

/** Map flat files in a directory to a repo-relative prefix (e.g. Cline global rules). */
function collectShallowDir(absDir: string, relPrefix: string, files: Map<string, string>): CollectionResult {
  const incompleteReasons: ScanIncompleteReason[] = [];
  const stat = safeStat(absDir);
  if (!stat?.isDirectory()) return { incompleteReasons };

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    addFirstReason(incompleteReasons, { code: 'unreadable-directory', path: relPrefix });
    return { incompleteReasons };
  }
  entries.sort((a, b) => compareLexically(a.name, b.name));

  for (const entry of entries) {
    if (files.size >= OVERLAY_MAX_FILES) {
      addFirstReason(incompleteReasons, {
        code: 'file-count-limit',
        path: `${relPrefix}/${entry.name}`,
        limit: OVERLAY_MAX_FILES,
      });
      break;
    }
    if (!entry.isFile()) continue;
    const relPosix = toPosixRel(`${relPrefix}/${entry.name}`);
    if (isHarnessRelPath(relPosix)) {
      files.set(relPosix, path.join(absDir, entry.name));
    }
  }
  return { incompleteReasons };
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
    // Copilot
    [path.join(home, '.copilot', 'skills'), '.github/skills'],
    [path.join(home, '.copilot', 'agents'), '.github/agents'],
    [path.join(home, '.copilot', 'hooks'), '.github/hooks'],
    // Cline / Devin Local
    [path.join(home, '.cline', 'skills'), '.cline/skills'],
    [path.join(home, '.cline', 'rules'), '.cline/rules'],
    [path.join(xdg, 'devin', 'rules'), '.devin/rules'],
    [path.join(xdg, 'devin', 'skills'), '.devin/skills'],
    [path.join(xdg, 'devin', 'agents'), '.devin/agents'],
    [path.join(xdg, 'devin', 'workflows'), '.devin/workflows'],
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
    [path.join(home, '.codeium', 'windsurf', 'global_workflows'), '.windsurf/workflows'],
    // Continue
    [path.join(home, '.continue', 'rules'), '.continue/rules'],
    [path.join(home, '.continue', 'prompts'), '.continue/prompts'],
    [path.join(home, '.continue', 'mcpServers'), '.continue/mcpServers'],
    // Zed
    [path.join(home, '.zed', 'commands'), '.zed/commands'],
    // OpenCode
    [path.join(xdg, 'opencode', 'agents'), '.opencode/agents'],
    [path.join(xdg, 'opencode', 'commands'), '.opencode/commands'],
    [path.join(xdg, 'opencode', 'skills'), '.opencode/skills'],
  ];
}

/**
 * Single files whose on-disk location differs from the repo-relative path
 * the scanner checks (alias mapping for effective score parity).
 */
function userHarnessFileAliases(home: string, xdg: string): Array<[string, string]> {
  return [
    [path.join(home, '.cursor', 'mcp.json'), '.cursor/mcp.json'],
    [path.join(home, '.claude', 'settings.json'), '.claude/settings.json'],
    [path.join(home, '.mcp.json'), '.mcp.json'],
    [path.join(home, '.junie', 'AGENTS.md'), 'AGENTS.md'],
    [path.join(home, '.agents', 'AGENTS.md'), 'AGENTS.md'],
    [path.join(home, '.codex', 'AGENTS.md'), 'AGENTS.md'],
    [path.join(home, '.codex', 'hooks.json'), '.codex/hooks.json'],
    [path.join(home, '.codex', 'config.toml'), '.codex/config.toml'],
    [path.join(xdg, 'devin', 'AGENTS.md'), 'AGENTS.md'],
    [path.join(xdg, 'devin', 'hooks.v1.json'), '.devin/hooks.v1.json'],
    [path.join(xdg, 'devin', 'mcp_config.json'), '.devin/mcp_config.json'],
    [path.join(xdg, 'opencode', 'opencode.json'), 'opencode.json'],
    [path.join(xdg, 'opencode', 'opencode.jsonc'), 'opencode.jsonc'],
    [path.join(xdg, 'zed', 'AGENTS.md'), 'AGENTS.md'],
    [
      path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Zed', 'AGENTS.md'),
      'AGENTS.md',
    ],
    // Windsurf global rules live under Codeium, not .windsurf/rules/
    [
      path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md'),
      '.windsurf/rules/global_rules.md',
    ],
  ];
}

/** Cline global rules directories (OS-specific Documents paths). */
function clineGlobalRulesDirs(home: string): string[] {
  const docs = documentsPath(home);
  return [path.join(docs, 'Cline', 'Rules'), path.join(home, 'Cline', 'Rules')];
}

/** Walk an extra root and collect harness-shaped relative paths. */
function collectExtraRoot(absRoot: string, files: Map<string, string>): CollectionResult {
  const incompleteReasons: ScanIncompleteReason[] = [];
  const stat = safeStat(absRoot);
  if (!stat) {
    addFirstReason(incompleteReasons, { code: 'unreadable-directory', path: '.' });
    return { incompleteReasons };
  }

  if (stat.isFile()) {
    const rel = toPosixRel(path.basename(absRoot));
    if (isHarnessRelPath(rel)) files.set(rel, absRoot);
    return { incompleteReasons };
  }

  if (stat.isDirectory()) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absRoot, { withFileTypes: true });
    } catch {
      addFirstReason(incompleteReasons, { code: 'unreadable-directory', path: '.' });
      return { incompleteReasons };
    }
    entries.sort((a, b) => compareLexically(a.name, b.name));
    for (const entry of entries) {
      if (files.size >= OVERLAY_MAX_FILES) {
        addFirstReason(incompleteReasons, {
          code: 'file-count-limit',
          path: entry.name,
          limit: OVERLAY_MAX_FILES,
        });
        break;
      }
      const abs = path.join(absRoot, entry.name);
      const relPosix = toPosixRel(entry.name);
      if (entry.isDirectory()) {
        const sub = collectDir(abs, relPosix, files, 1);
        mergeReasons(incompleteReasons, sub.incompleteReasons);
      } else if (entry.isFile() && isHarnessRelPath(relPosix)) {
        files.set(relPosix, abs);
      }
    }
  }
  return { incompleteReasons };
}

function overlayFromMap(
  label: string,
  files: Map<string, string>,
  incompleteReasons: ScanIncompleteReason[],
): ScanOverlay | null {
  if (files.size === 0 && incompleteReasons.length === 0) return null;
  return {
    label,
    files,
    truncated: incompleteReasons.length > 0,
    incompleteReasons,
  };
}

/** User-level harness locations (OS-aware, allowlisted only). */
export function buildUserOverlay(): ScanOverlay | null {
  const home = userHome();
  const xdg = xdgConfigHome();
  const files = new Map<string, string>();
  const incompleteReasons: ScanIncompleteReason[] = [];

  for (const [absDir, relPrefix] of userHarnessDirs(home, xdg)) {
    const result = collectDir(absDir, relPrefix, files);
    mergeReasons(incompleteReasons, result.incompleteReasons);
  }

  for (const dir of clineGlobalRulesDirs(home)) {
    const result = collectShallowDir(dir, '.clinerules', files);
    mergeReasons(incompleteReasons, result.incompleteReasons);
  }

  for (const [abs, rel] of userHarnessFileAliases(home, xdg)) {
    collectFile(abs, rel, files);
  }

  collectClaudeUserInstalledPlugins(home, files, incompleteReasons);

  return overlayFromMap('user', files, incompleteReasons);
}

function collectClaudeUserInstalledPlugins(
  home: string,
  files: Map<string, string>,
  incompleteReasons: ScanIncompleteReason[],
): void {
  const registryPath = claudePluginsRegistryPath(home);
  let raw: string;
  try {
    raw = fs.readFileSync(registryPath, 'utf8');
  } catch {
    return;
  }
  const parsed = safeJsonParse(raw);
  if (parsed === undefined) {
    addFirstReason(incompleteReasons, {
      code: 'unreadable-path',
      path: 'user:.claude/plugins/installed_plugins.json',
    });
    return;
  }
  const registry = parseInstalledPluginsRegistry(parsed);
  if (!registry) {
    addFirstReason(incompleteReasons, {
      code: 'unreadable-path',
      path: 'user:.claude/plugins/installed_plugins.json',
    });
    return;
  }
  const enabledPlugins = readClaudeEnabledPlugins(home);
  for (const [pluginKey, entries] of Object.entries(registry)) {
    for (const entry of entries) {
      if (!shouldIncludeInstalledPlugin(pluginKey, entry, enabledPlugins)) continue;
      collectClaudePluginInstall(entry.installPath!, pluginKey, files, true);
    }
  }
}

/** System-level harness locations (minimal v1 — expand when paths are validated). */
export function buildSystemOverlay(): ScanOverlay | null {
  // Reserved for shared/system-wide harness installs; empty until validated per OS.
  return null;
}

export function buildExtraRootOverlay(repoRoot: string, entry: ExtraRootEntry): ScanOverlay | null {
  const absRoot = path.resolve(repoRoot, entry.path);
  const files = new Map<string, string>();
  const { incompleteReasons } = collectExtraRoot(absRoot, files);
  return overlayFromMap(entry.id, files, incompleteReasons);
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
