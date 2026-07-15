/** Stable tool identifiers surfaced in scan reports. */
export type ToolId =
  | 'cursor'
  | 'windsurf'
  | 'cline'
  | 'continue'
  | 'copilot'
  | 'claude-code'
  | 'codex'
  | 'opencode'
  | 'antigravity'
  | 'zed';

export type HarnessKind = 'rules' | 'skills' | 'commands' | 'subagents' | 'hooks' | 'mcp';

export interface PathSpec {
  toolId: ToolId;
  kind: HarnessKind;
  /** Regex tested against ScanContext file paths (POSIX). */
  pathRegex: RegExp;
}

/** Root context files checked by CTX-01/02. Order is preference for evidence only. */
export const CONTEXT_ROOT_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'] as const;

export const PATH_SPECS: PathSpec[] = [
  // Rules
  { toolId: 'cursor', kind: 'rules', pathRegex: /(^|\/)\.cursor\/rules\/[^/]+\.mdc$/ },
  { toolId: 'windsurf', kind: 'rules', pathRegex: /(^|\/)\.windsurf\/rules\/[^/]+\.md$/ },
  { toolId: 'cline', kind: 'rules', pathRegex: /(^|\/)\.clinerules\/[^/]+\.md$/ },
  { toolId: 'continue', kind: 'rules', pathRegex: /(^|\/)\.continue\/rules\/[^/]+\.md$/ },
  {
    toolId: 'copilot',
    kind: 'rules',
    pathRegex: /(^|\/)\.github\/instructions\/[^/]+\.instructions\.md$/,
  },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /(^|\/)\.agents\/rules\/[^/]+$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /(^|\/)\.agent\/rules\/[^/]+$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /(^|\/)\.gemini\/rules\/[^/]+$/ },
  // Nested context files (root ones are CTX-01's job) — directory-scoped
  // guidance loaded automatically by Codex/Cursor (AGENTS.md), Claude Code
  // (CLAUDE.md), and Gemini/Antigravity (GEMINI.md).
  { toolId: 'codex', kind: 'rules', pathRegex: /.\/AGENTS\.md$/ },
  { toolId: 'claude-code', kind: 'rules', pathRegex: /.\/CLAUDE\.md$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /.\/GEMINI\.md$/ },

  // Skills
  { toolId: 'cursor', kind: 'skills', pathRegex: /(^|\/)\.cursor\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'claude-code', kind: 'skills', pathRegex: /(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'codex', kind: 'skills', pathRegex: /(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'antigravity', kind: 'skills', pathRegex: /(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/ },

  // Commands / workflows
  { toolId: 'cursor', kind: 'commands', pathRegex: /(^|\/)\.cursor\/commands\/[^/]+\.md$/ },
  { toolId: 'claude-code', kind: 'commands', pathRegex: /(^|\/)\.claude\/commands\/[^/]+\.md$/ },
  { toolId: 'windsurf', kind: 'commands', pathRegex: /(^|\/)\.windsurf\/workflows\/[^/]+\.md$/ },
  { toolId: 'continue', kind: 'commands', pathRegex: /(^|\/)\.continue\/prompts\/[^/]+$/ },
  { toolId: 'zed', kind: 'commands', pathRegex: /(^|\/)\.zed\/commands\/[^/]+\.md$/ },
  { toolId: 'antigravity', kind: 'commands', pathRegex: /(^|\/)\.agents\/workflows\/[^/]+$/ },
  { toolId: 'antigravity', kind: 'commands', pathRegex: /(^|\/)\.agent\/workflows\/[^/]+$/ },

  // Subagents
  { toolId: 'cursor', kind: 'subagents', pathRegex: /(^|\/)\.cursor\/agents\/[^/]+\.md$/ },
  { toolId: 'claude-code', kind: 'subagents', pathRegex: /(^|\/)\.claude\/agents\/[^/]+\.md$/ },
  { toolId: 'opencode', kind: 'subagents', pathRegex: /(^|\/)\.opencode\/agents\/[^/]+\.md$/ },

  // Hooks (config file paths — payload parsed separately)
  { toolId: 'cursor', kind: 'hooks', pathRegex: /(^|\/)\.cursor\/hooks\.json$/ },
  { toolId: 'claude-code', kind: 'hooks', pathRegex: /(^|\/)\.claude\/settings\.json$/ },

  // MCP
  { toolId: 'cursor', kind: 'mcp', pathRegex: /(^|\/)\.cursor\/mcp\.json$/ },
  { toolId: 'claude-code', kind: 'mcp', pathRegex: /(^|\/)\.mcp\.json$/ },
  { toolId: 'antigravity', kind: 'mcp', pathRegex: /(^|\/)\.agents\/mcp_config\.json$/ },
  { toolId: 'antigravity', kind: 'mcp', pathRegex: /(^|\/)\.agent\/mcp_config\.json$/ },
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
