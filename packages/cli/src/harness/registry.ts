import * as path from 'node:path';
import type { ScanContext } from '../types.js';
import { compareLexically } from '../util.js';
import { pluginLayoutAtScanRoot, pluginLayoutToolId, pluginPhysicalToCanonical } from './plugins.js';

/** Stable tool identifiers surfaced in scan reports. */
export type ToolId =
  | 'cursor'
  | 'windsurf'
  | 'cline'
  | 'continue'
  | 'copilot'
  | 'claude-code'
  | 'devin'
  | 'codex'
  | 'opencode'
  | 'antigravity'
  | 'zed';

export type HarnessKind = 'rules' | 'skills' | 'commands' | 'subagents' | 'hooks' | 'mcp';

/** Human-readable tool names for report renderers. */
export const TOOL_DISPLAY_NAMES: Record<ToolId, string> = {
  cursor: 'Cursor',
  windsurf: 'Windsurf',
  cline: 'Cline',
  continue: 'Continue',
  copilot: 'GitHub Copilot',
  'claude-code': 'Claude Code',
  devin: 'Devin',
  codex: 'Codex',
  opencode: 'OpenCode',
  antigravity: 'Antigravity',
  zed: 'Zed',
};

/** Display name for a detected tool id; unknown ids pass through as-is. */
export function toolDisplayName(id: string): string {
  return TOOL_DISPLAY_NAMES[id as ToolId] ?? id;
}

export interface PathSpec {
  toolId: ToolId;
  kind: HarnessKind;
  /** Regex tested against ScanContext file paths (POSIX). */
  pathRegex: RegExp;
  /** Tool-native directory that may itself be used as the scan root. */
  nativeRoot?: string;
}

export interface PathSpecMatch {
  /** Physical path relative to ScanContext.root. */
  path: string;
  /** Canonical repository-relative shape used by PATH_SPECS. */
  canonicalPath: string;
  /** Number of path segments before the native tool directory. */
  nativeDepth: number;
}

function nativeDepth(canonicalPath: string, nativeRoot?: string): number {
  if (!nativeRoot) return 0;
  const segments = canonicalPath.split('/');
  const index = segments.indexOf(nativeRoot);
  return index === -1 ? 0 : index;
}

/** Match a path spec without changing the public root-relative ScanContext contract. */
export function matchPathSpec(ctx: ScanContext, spec: PathSpec): PathSpecMatch[] {
  const matches = new Map<string, PathSpecMatch>();
  for (const file of ctx.matching(spec.pathRegex)) {
    matches.set(file, {
      path: file,
      canonicalPath: file,
      nativeDepth: nativeDepth(file, spec.nativeRoot),
    });
  }

  if (spec.nativeRoot && path.basename(ctx.root) === spec.nativeRoot) {
    for (const file of ctx.files) {
      const canonicalPath = `${spec.nativeRoot}/${file}`;
      if (!spec.pathRegex.test(canonicalPath)) continue;
      matches.set(file, { path: file, canonicalPath, nativeDepth: 0 });
    }
  }

  const pluginLayout = pluginLayoutAtScanRoot(ctx);
  if (pluginLayout && spec.toolId === pluginLayoutToolId(pluginLayout)) {
    const hasSkillsDir = ctx.files.some((file) => file === 'skills' || file.startsWith('skills/'));
    for (const file of ctx.files) {
      const canonicalPath = pluginPhysicalToCanonical(file, pluginLayout, hasSkillsDir);
      if (!canonicalPath || !spec.pathRegex.test(canonicalPath)) continue;
      matches.set(file, { path: file, canonicalPath, nativeDepth: 0 });
    }
  }

  return [...matches.values()].sort((a, b) => compareLexically(a.path, b.path));
}

/** Project guide paths checked by CTX-01/02. Order is preference for evidence only. */
export const CONTEXT_ROOT_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.claude/CLAUDE.md',
  '.claude/AGENTS.md',
] as const;

/** Claude Code session-start instructions — never CTX-03..06 rule artifacts. */
export const CLAUDE_PROJECT_GUIDE_PATHS = new Set<string>(['.claude/CLAUDE.md', '.claude/AGENTS.md']);

export const PATH_SPECS: PathSpec[] = [
  // Rules
  {
    toolId: 'cursor',
    kind: 'rules',
    pathRegex: /(^|\/)\.cursor\/rules\/[^/]+\.mdc$/,
    nativeRoot: '.cursor',
  },
  {
    toolId: 'windsurf',
    kind: 'rules',
    pathRegex: /(^|\/)\.windsurf\/rules\/[^/]+\.md$/,
    nativeRoot: '.windsurf',
  },
  {
    toolId: 'cline',
    kind: 'rules',
    pathRegex: /(^|\/)\.clinerules\/[^/]+\.md$/,
    nativeRoot: '.clinerules',
  },
  {
    toolId: 'continue',
    kind: 'rules',
    pathRegex: /(^|\/)\.continue\/rules\/[^/]+\.md$/,
    nativeRoot: '.continue',
  },
  {
    toolId: 'copilot',
    kind: 'rules',
    pathRegex: /(^|\/)\.github\/instructions\/[^/]+\.instructions\.md$/,
    nativeRoot: '.github',
  },
  {
    toolId: 'antigravity',
    kind: 'rules',
    pathRegex: /(^|\/)\.agents\/rules\/[^/]+$/,
    nativeRoot: '.agents',
  },
  {
    toolId: 'antigravity',
    kind: 'rules',
    pathRegex: /(^|\/)\.agent\/rules\/[^/]+$/,
    nativeRoot: '.agent',
  },
  {
    toolId: 'antigravity',
    kind: 'rules',
    pathRegex: /(^|\/)\.gemini\/rules\/[^/]+$/,
    nativeRoot: '.gemini',
  },
  {
    toolId: 'claude-code',
    kind: 'rules',
    pathRegex: /(^|\/)\.claude\/rules\/.+\.md$/,
    nativeRoot: '.claude',
  },
  // Nested context files (root ones are CTX-01's job) — directory-scoped
  // guidance loaded automatically by Codex/Cursor (AGENTS.md), Claude Code
  // (CLAUDE.md), and Gemini/Antigravity (GEMINI.md).
  { toolId: 'codex', kind: 'rules', pathRegex: /.\/AGENTS\.md$/ },
  { toolId: 'claude-code', kind: 'rules', pathRegex: /.\/CLAUDE\.md$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /.\/GEMINI\.md$/ },

  // Skills
  {
    toolId: 'cursor',
    kind: 'skills',
    pathRegex: /(^|\/)\.cursor\/skills\/[^/]+\/SKILL\.md$/,
    nativeRoot: '.cursor',
  },
  {
    toolId: 'claude-code',
    kind: 'skills',
    pathRegex: /(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/,
    nativeRoot: '.claude',
  },
  {
    toolId: 'devin',
    kind: 'skills',
    pathRegex: /(^|\/)\.devin\/skills\/[^/]+\/SKILL\.md$/,
    nativeRoot: '.devin',
  },
  {
    toolId: 'codex',
    kind: 'skills',
    pathRegex: /(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/,
    nativeRoot: '.agents',
  },
  {
    toolId: 'antigravity',
    kind: 'skills',
    pathRegex: /(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/,
    nativeRoot: '.agents',
  },

  // Commands / workflows
  {
    toolId: 'cursor',
    kind: 'commands',
    pathRegex: /(^|\/)\.cursor\/commands\/[^/]+\.md$/,
    nativeRoot: '.cursor',
  },
  {
    toolId: 'claude-code',
    kind: 'commands',
    pathRegex: /(^|\/)\.claude\/commands\/[^/]+\.md$/,
    nativeRoot: '.claude',
  },
  {
    toolId: 'windsurf',
    kind: 'commands',
    pathRegex: /(^|\/)\.windsurf\/workflows\/[^/]+\.md$/,
    nativeRoot: '.windsurf',
  },
  {
    toolId: 'continue',
    kind: 'commands',
    pathRegex: /(^|\/)\.continue\/prompts\/[^/]+$/,
    nativeRoot: '.continue',
  },
  {
    toolId: 'zed',
    kind: 'commands',
    pathRegex: /(^|\/)\.zed\/commands\/[^/]+\.md$/,
    nativeRoot: '.zed',
  },
  {
    toolId: 'antigravity',
    kind: 'commands',
    pathRegex: /(^|\/)\.agents\/workflows\/[^/]+$/,
    nativeRoot: '.agents',
  },
  {
    toolId: 'antigravity',
    kind: 'commands',
    pathRegex: /(^|\/)\.agent\/workflows\/[^/]+$/,
    nativeRoot: '.agent',
  },

  // Subagents
  {
    toolId: 'cursor',
    kind: 'subagents',
    pathRegex: /(^|\/)\.cursor\/agents\/[^/]+\.md$/,
    nativeRoot: '.cursor',
  },
  {
    toolId: 'claude-code',
    kind: 'subagents',
    pathRegex: /(^|\/)\.claude\/agents\/[^/]+\.md$/,
    nativeRoot: '.claude',
  },
  {
    toolId: 'opencode',
    kind: 'subagents',
    pathRegex: /(^|\/)\.opencode\/agents\/[^/]+\.md$/,
    nativeRoot: '.opencode',
  },

  // Hooks (config file paths — payload parsed separately)
  {
    toolId: 'cursor',
    kind: 'hooks',
    pathRegex: /(^|\/)\.cursor\/hooks\.json$/,
    nativeRoot: '.cursor',
  },
  {
    toolId: 'claude-code',
    kind: 'hooks',
    pathRegex: /(^|\/)\.claude\/settings\.json$/,
    nativeRoot: '.claude',
  },
  {
    toolId: 'devin',
    kind: 'hooks',
    pathRegex: /(^|\/)\.devin\/hooks\.v1\.json$/,
    nativeRoot: '.devin',
  },
  {
    toolId: 'devin',
    kind: 'hooks',
    pathRegex: /(^|\/)\.devin\/config\.json$/,
    nativeRoot: '.devin',
  },

  // MCP
  {
    toolId: 'cursor',
    kind: 'mcp',
    pathRegex: /(^|\/)\.cursor\/mcp\.json$/,
    nativeRoot: '.cursor',
  },
  { toolId: 'claude-code', kind: 'mcp', pathRegex: /(^|\/)\.mcp\.json$/ },
  {
    toolId: 'antigravity',
    kind: 'mcp',
    pathRegex: /(^|\/)\.agents\/mcp_config\.json$/,
    nativeRoot: '.agents',
  },
  {
    toolId: 'antigravity',
    kind: 'mcp',
    pathRegex: /(^|\/)\.agent\/mcp_config\.json$/,
    nativeRoot: '.agent',
  },
];

/** Plugin-facing path hints — kept in sync with PATH_SPECS via plugins:sync-check. */
export const PLUGIN_TOOL_PATHS: Record<
  string,
  { skillsDir: string; commandsDir: string; mcpConfigPath: string }
> = {
  cursor: {
    skillsDir: '.cursor/skills',
    commandsDir: '.cursor/commands',
    mcpConfigPath: '.cursor/mcp.json',
  },
  'claude-code': {
    skillsDir: '.claude/skills',
    commandsDir: '.claude/commands',
    mcpConfigPath: '.mcp.json',
  },
  windsurf: {
    skillsDir: '.agents/skills',
    commandsDir: '.windsurf/workflows',
    mcpConfigPath: '.agents/mcp_config.json',
  },
};

export function specsForKind(kind: HarnessKind): PathSpec[] {
  return PATH_SPECS.filter((s) => s.kind === kind);
}
