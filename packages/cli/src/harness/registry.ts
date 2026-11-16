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
  'AGENT.md',
  'AGENTS.local.md',
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
    toolId: 'cline',
    kind: 'rules',
    pathRegex: /(^|\/)\.clinerules$/,
  },
  {
    toolId: 'cline',
    kind: 'rules',
    pathRegex: /(^|\/)\.cline\/rules\/[^/]+\.md$/,
    nativeRoot: '.cline',
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
    toolId: 'copilot',
    kind: 'rules',
    pathRegex: /(^|\/)\.github\/copilot-instructions\.md$/,
    nativeRoot: '.github',
  },
  {
    toolId: 'zed',
    kind: 'rules',
    pathRegex: /(^|\/)\.rules$/,
  },
  {
    toolId: 'windsurf',
    kind: 'rules',
    pathRegex: /(^|\/)(?:\.windsurfrules|\.windsurf\/global_rules\.md)$/,
  },
  {
    toolId: 'devin',
    kind: 'rules',
    pathRegex: /(^|\/)\.devin\/(?:rules\/[^/]+\.md|global_rules\.md)$/,
    nativeRoot: '.devin',
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
  { toolId: 'devin', kind: 'rules', pathRegex: /.\/(?:AGENT|AGENTS|AGENTS\.local)\.md$/ },
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
    pathRegex: /(^|\/)\.devin\/skills\/.+\/SKILL\.md$/,
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
  {
    toolId: 'copilot',
    kind: 'skills',
    pathRegex: /(^|\/)\.github\/skills\/.+\/SKILL\.md$/,
    nativeRoot: '.github',
  },
  {
    toolId: 'copilot',
    kind: 'skills',
    pathRegex: /(^|\/)\.agents\/skills\/.+\/SKILL\.md$/,
    nativeRoot: '.agents',
  },
  {
    toolId: 'cline',
    kind: 'skills',
    pathRegex: /(^|\/)\.cline\/skills\/.+\/SKILL\.md$/,
    nativeRoot: '.cline',
  },
  {
    toolId: 'cline',
    kind: 'skills',
    pathRegex: /(^|\/)\.clinerules\/skills\/.+\/SKILL\.md$/,
    nativeRoot: '.clinerules',
  },
  {
    toolId: 'opencode',
    kind: 'skills',
    pathRegex: /(^|\/)\.opencode\/skills\/(?:[^/]+\.md|.+\/SKILL\.md)$/,
    nativeRoot: '.opencode',
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
    toolId: 'copilot',
    kind: 'commands',
    pathRegex: /(^|\/)\.github\/prompts\/[^/]+\.prompt\.md$/,
    nativeRoot: '.github',
  },
  {
    toolId: 'opencode',
    kind: 'commands',
    pathRegex: /(^|\/)\.opencode\/commands\/.+\.md$/,
    nativeRoot: '.opencode',
  },
  {
    toolId: 'devin',
    kind: 'commands',
    pathRegex: /(^|\/)\.devin\/workflows\/[^/]+\.md$/,
    nativeRoot: '.devin',
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
  {
    toolId: 'devin',
    kind: 'subagents',
    pathRegex: /(^|\/)\.devin\/agents\/(?:[^/]+\.md|[^/]+\/AGENT\.md)$/,
    nativeRoot: '.devin',
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
    toolId: 'copilot',
    kind: 'hooks',
    pathRegex: /(^|\/)\.github\/hooks\/[^/]+\.json$/,
    nativeRoot: '.github',
  },
  {
    toolId: 'codex',
    kind: 'hooks',
    pathRegex: /(^|\/)\.codex\/hooks\.json$/,
    nativeRoot: '.codex',
  },
  {
    toolId: 'codex',
    kind: 'hooks',
    pathRegex: /(^|\/)\.codex\/config\.toml$/,
    nativeRoot: '.codex',
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
  {
    toolId: 'continue',
    kind: 'mcp',
    pathRegex: /(^|\/)\.continue\/mcpServers\/.+\.(?:json|ya?ml)$/,
    nativeRoot: '.continue',
  },
  {
    toolId: 'copilot',
    kind: 'mcp',
    pathRegex: /(^|\/)\.vscode\/mcp\.json$/,
  },
  {
    toolId: 'devin',
    kind: 'mcp',
    pathRegex: /(^|\/)\.devin\/mcp_config\.json$/,
    nativeRoot: '.devin',
  },
  {
    toolId: 'opencode',
    kind: 'mcp',
    pathRegex: /(^|\/)opencode\.jsonc?$/,
  },
  {
    toolId: 'codex',
    kind: 'mcp',
    pathRegex: /(^|\/)\.codex\/config\.toml$/,
    nativeRoot: '.codex',
  },
];

/** Official tool-specific files that identify a harness but do not map to a scored artifact kind. */
export const TOOL_DETECTION_PATHS: Partial<Record<ToolId, RegExp[]>> = {
  copilot: [
    /\.github\/agents\/[^/]+\.md$/,
    /\.claude\/skills\/.+\/SKILL\.md$/,
    /\.agents\/skills\/.+\/SKILL\.md$/,
  ],
  cline: [/\.claude\/skills\/.+\/SKILL\.md$/],
  devin: [/\.agents\/skills\/.+\/SKILL\.md$/, /^AGENT\.md$/],
  opencode: [/\.claude\/skills\/.+\/SKILL\.md$/, /\.agents\/skills\/.+\/SKILL\.md$/],
  zed: [/\.agents\/skills\/.+\/SKILL\.md$/],
};

/** Detection-only shared paths allowed in user/global overlays by vendor documentation. */
export const TOOL_GLOBAL_DETECTION_PATHS: Partial<Record<ToolId, RegExp[]>> = {
  copilot: [/\.github\/agents\/[^/]+\.md$/, /\.agents\/skills\/.+\/SKILL\.md$/],
  devin: [/\.agents\/skills\/.+\/SKILL\.md$/, /^AGENT\.md$/],
  opencode: [/\.claude\/skills\/.+\/SKILL\.md$/, /\.agents\/skills\/.+\/SKILL\.md$/],
  zed: [/\.agents\/skills\/.+\/SKILL\.md$/],
};

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
