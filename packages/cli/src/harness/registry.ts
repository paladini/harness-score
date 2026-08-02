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
  | 'gemini-cli'
  | 'antigravity'
  | 'zed'
  | 'kiro'
  | 'junie'
  | 'roo-code'
  | 'devin';

export type HarnessKind = 'rules' | 'skills' | 'commands' | 'subagents' | 'hooks' | 'mcp';

/** Human-readable tool names for report renderers. */
export const TOOL_DISPLAY_NAMES: Record<ToolId, string> = {
  cursor: 'Cursor',
  windsurf: 'Windsurf',
  cline: 'Cline',
  continue: 'Continue',
  copilot: 'GitHub Copilot',
  'claude-code': 'Claude Code',
  codex: 'Codex',
  opencode: 'OpenCode',
  'gemini-cli': 'Gemini CLI',
  antigravity: 'Antigravity',
  zed: 'Zed',
  kiro: 'Kiro',
  junie: 'JetBrains Junie',
  'roo-code': 'Roo Code',
  devin: 'Devin',
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
  /** False for cross-tool standards that should score without identifying a vendor. */
  detectTool?: boolean;
}

/** Root context files checked by CTX-01/02. Order is preference for evidence only. */
export const CONTEXT_ROOT_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'] as const;

export const PATH_SPECS: PathSpec[] = [
  // Rules
  { toolId: 'cursor', kind: 'rules', pathRegex: /(^|\/)\.cursor\/rules\/[^/]+\.mdc$/ },
  { toolId: 'windsurf', kind: 'rules', pathRegex: /(^|\/)\.windsurf\/rules\/[^/]+\.md$/ },
  { toolId: 'cline', kind: 'rules', pathRegex: /(^|\/)\.clinerules\/(?!hooks\/).+\.(?:md|txt)$/ },
  { toolId: 'continue', kind: 'rules', pathRegex: /(^|\/)\.continue\/rules\/[^/]+\.md$/ },
  { toolId: 'claude-code', kind: 'rules', pathRegex: /(^|\/)\.claude\/rules\/.+\.md$/ },
  {
    toolId: 'copilot',
    kind: 'rules',
    pathRegex: /(^|\/)\.github\/instructions\/[^/]+\.instructions\.md$/,
  },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /(^|\/)\.agents\/rules\/[^/]+$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /(^|\/)\.agent\/rules\/[^/]+$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /(^|\/)\.gemini\/rules\/[^/]+$/ },
  { toolId: 'kiro', kind: 'rules', pathRegex: /(^|\/)\.kiro\/steering\/.+\.md$/ },
  { toolId: 'junie', kind: 'rules', pathRegex: /(^|\/)\.junie\/AGENTS\.md$/ },
  { toolId: 'roo-code', kind: 'rules', pathRegex: /(^|\/)\.roo\/rules(?:-[^/]+)?\/.+$/ },
  { toolId: 'roo-code', kind: 'rules', pathRegex: /(^|\/)\.roorules(?:-[^/]+)?$/ },
  // Nested context files (root ones are CTX-01's job) — directory-scoped
  // guidance loaded automatically by Codex/Cursor (AGENTS.md), Claude Code
  // (CLAUDE.md), and Gemini/Antigravity (GEMINI.md).
  { toolId: 'codex', kind: 'rules', pathRegex: /.\/AGENTS\.md$/ },
  { toolId: 'claude-code', kind: 'rules', pathRegex: /.\/CLAUDE\.md$/ },
  { toolId: 'antigravity', kind: 'rules', pathRegex: /.\/GEMINI\.md$/ },

  // Skills
  { toolId: 'cursor', kind: 'skills', pathRegex: /(^|\/)\.cursor\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'claude-code', kind: 'skills', pathRegex: /(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/ },
  {
    toolId: 'codex',
    kind: 'skills',
    pathRegex: /(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/,
    detectTool: false,
  },
  { toolId: 'windsurf', kind: 'skills', pathRegex: /(^|\/)\.windsurf\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'cline', kind: 'skills', pathRegex: /(^|\/)\.cline\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'copilot', kind: 'skills', pathRegex: /(^|\/)\.github\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'opencode', kind: 'skills', pathRegex: /(^|\/)\.opencode\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'gemini-cli', kind: 'skills', pathRegex: /(^|\/)\.gemini\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'kiro', kind: 'skills', pathRegex: /(^|\/)\.kiro\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'junie', kind: 'skills', pathRegex: /(^|\/)\.junie\/skills\/[^/]+\/SKILL\.md$/ },
  { toolId: 'roo-code', kind: 'skills', pathRegex: /(^|\/)\.roo\/skills(?:-[^/]+)?\/[^/]+\/SKILL\.md$/ },
  { toolId: 'devin', kind: 'skills', pathRegex: /(^|\/)\.cognition\/skills\/[^/]+\/SKILL\.md$/ },

  // Commands / workflows
  { toolId: 'cursor', kind: 'commands', pathRegex: /(^|\/)\.cursor\/commands\/[^/]+\.md$/ },
  { toolId: 'claude-code', kind: 'commands', pathRegex: /(^|\/)\.claude\/commands\/[^/]+\.md$/ },
  { toolId: 'windsurf', kind: 'commands', pathRegex: /(^|\/)\.windsurf\/workflows\/[^/]+\.md$/ },
  { toolId: 'continue', kind: 'commands', pathRegex: /(^|\/)\.continue\/prompts\/[^/]+$/ },
  { toolId: 'zed', kind: 'commands', pathRegex: /(^|\/)\.zed\/commands\/[^/]+\.md$/ },
  { toolId: 'antigravity', kind: 'commands', pathRegex: /(^|\/)\.agents\/workflows\/[^/]+$/ },
  { toolId: 'antigravity', kind: 'commands', pathRegex: /(^|\/)\.agent\/workflows\/[^/]+$/ },
  { toolId: 'copilot', kind: 'commands', pathRegex: /(^|\/)\.github\/prompts\/.+\.prompt\.md$/ },
  { toolId: 'gemini-cli', kind: 'commands', pathRegex: /(^|\/)\.gemini\/commands\/.+\.toml$/ },

  // Subagents
  { toolId: 'cursor', kind: 'subagents', pathRegex: /(^|\/)\.cursor\/agents\/[^/]+\.md$/ },
  { toolId: 'claude-code', kind: 'subagents', pathRegex: /(^|\/)\.claude\/agents\/[^/]+\.md$/ },
  { toolId: 'opencode', kind: 'subagents', pathRegex: /(^|\/)\.opencode\/agents\/[^/]+\.md$/ },
  { toolId: 'copilot', kind: 'subagents', pathRegex: /(^|\/)\.github\/agents\/[^/]+\.md$/ },
  { toolId: 'gemini-cli', kind: 'subagents', pathRegex: /(^|\/)\.gemini\/agents\/[^/]+\.md$/ },
  { toolId: 'kiro', kind: 'subagents', pathRegex: /(^|\/)\.kiro\/agents\/.+\.(?:md|json)$/ },
  { toolId: 'junie', kind: 'subagents', pathRegex: /(^|\/)\.junie\/agents\/[^/]+\.md$/ },
  {
    toolId: 'junie',
    kind: 'subagents',
    pathRegex: /(^|\/)\.agents\/[^/]+\.md$/,
    detectTool: false,
  },
  { toolId: 'roo-code', kind: 'subagents', pathRegex: /(^|\/)\.roomodes$/ },

  // Hooks (config file paths — payload parsed separately)
  { toolId: 'cursor', kind: 'hooks', pathRegex: /(^|\/)\.cursor\/hooks\.json$/ },
  { toolId: 'claude-code', kind: 'hooks', pathRegex: /(^|\/)\.claude\/settings\.json$/ },
  { toolId: 'copilot', kind: 'hooks', pathRegex: /(^|\/)\.github\/hooks\/[^/]+\.json$/ },
  { toolId: 'windsurf', kind: 'hooks', pathRegex: /(^|\/)\.windsurf\/hooks\.json$/ },
  { toolId: 'cline', kind: 'hooks', pathRegex: /(^|\/)\.clinerules\/hooks\/[^/]+(?:\.ps1)?$/ },
  { toolId: 'gemini-cli', kind: 'hooks', pathRegex: /(^|\/)\.gemini\/settings\.json$/ },
  { toolId: 'antigravity', kind: 'hooks', pathRegex: /(^|\/)\.agents\/hooks\.json$/ },
  { toolId: 'kiro', kind: 'hooks', pathRegex: /(^|\/)\.kiro\/hooks\/[^/]+\.json$/ },

  // MCP
  { toolId: 'cursor', kind: 'mcp', pathRegex: /(^|\/)\.cursor\/mcp\.json$/ },
  { toolId: 'claude-code', kind: 'mcp', pathRegex: /(^|\/)\.mcp\.json$/ },
  { toolId: 'antigravity', kind: 'mcp', pathRegex: /(^|\/)\.agents\/mcp_config\.json$/ },
  { toolId: 'antigravity', kind: 'mcp', pathRegex: /(^|\/)\.agent\/mcp_config\.json$/ },
  { toolId: 'continue', kind: 'mcp', pathRegex: /(^|\/)\.continue\/mcpServers\/[^/]+\.ya?ml$/ },
  { toolId: 'continue', kind: 'mcp', pathRegex: /(^|\/)\.continue\/config\.ya?ml$/ },
  { toolId: 'gemini-cli', kind: 'mcp', pathRegex: /(^|\/)\.gemini\/settings\.json$/ },
  { toolId: 'kiro', kind: 'mcp', pathRegex: /(^|\/)\.kiro\/settings\/mcp\.json$/ },
  { toolId: 'kiro', kind: 'mcp', pathRegex: /(^|\/)\.kiro\/agents\/.+\.(?:md|json)$/ },
  { toolId: 'roo-code', kind: 'mcp', pathRegex: /(^|\/)\.roo\/mcp\.json$/ },
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
