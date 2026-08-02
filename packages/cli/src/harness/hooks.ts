import type { ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';
import type { HarnessArtifact } from './collectors.js';
import { collectHookConfigs } from './collectors.js';
import type { ToolId } from './registry.js';

const CURSOR_KNOWN_EVENTS = new Set([
  'sessionStart',
  'sessionEnd',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'subagentStart',
  'subagentStop',
  'beforeShellExecution',
  'afterShellExecution',
  'beforeMCPExecution',
  'afterMCPExecution',
  'beforeReadFile',
  'afterFileEdit',
  'beforeSubmitPrompt',
  'preCompact',
  'stop',
  'afterAgentResponse',
  'afterAgentThought',
  'beforeTabFileRead',
  'afterTabFileEdit',
  'workspaceOpen',
]);

const CLAUDE_KNOWN_EVENTS = new Set([
  'SessionStart',
  'Setup',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'PreToolUse',
  'PermissionRequest',
  'PermissionDenied',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Notification',
  'SubagentStart',
  'SubagentStop',
  'TaskCreated',
  'TaskCompleted',
  'InstructionsLoaded',
  'PreCompact',
  'PostCompact',
  'Stop',
  'SessionEnd',
]);

const COPILOT_KNOWN_EVENTS = new Set([
  'sessionStart',
  'SessionStart',
  'sessionEnd',
  'SessionEnd',
  'userPromptSubmitted',
  'UserPromptSubmit',
  'userPromptTransformed',
  'preToolUse',
  'PreToolUse',
  'postToolUse',
  'PostToolUse',
  'postToolUseFailure',
  'PostToolUseFailure',
  'permissionRequest',
  'notification',
  'agentStop',
  'Stop',
  'subagentStart',
  'subagentStop',
  'SubagentStop',
  'preCompact',
  'PreCompact',
  'errorOccurred',
]);

const WINDSURF_KNOWN_EVENTS = new Set([
  'pre_read_code',
  'post_read_code',
  'pre_write_code',
  'post_write_code',
  'pre_run_command',
  'post_run_command',
  'pre_mcp_tool_use',
  'post_mcp_tool_use',
  'pre_user_prompt',
  'post_cascade_response',
  'post_cascade_response_with_transcript',
  'post_setup_worktree',
]);

const CLINE_KNOWN_EVENTS = new Set([
  'TaskStart',
  'TaskResume',
  'TaskCancel',
  'TaskComplete',
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'PreCompact',
]);

const GEMINI_KNOWN_EVENTS = new Set([
  'SessionStart',
  'SessionEnd',
  'BeforeAgent',
  'AfterAgent',
  'BeforeModel',
  'AfterModel',
  'BeforeToolSelection',
  'BeforeTool',
  'AfterTool',
  'PreCompress',
  'Notification',
]);

const KIRO_KNOWN_EVENTS = new Set([
  'SessionStart',
  'Stop',
  'PreToolUse',
  'PostToolUse',
  'PreTaskExec',
  'PostTaskExec',
  'UserPromptSubmit',
  'PostFileCreate',
  'PostFileSave',
  'PostFileDelete',
]);

export interface NormalizedHooks {
  source: string;
  toolId: ToolId;
  hasRequiredMetadata: boolean;
  events: string[];
  gateEvents: string[];
  feedbackEvents: string[];
  commands: string[];
  unknownEvents: string[];
  format: 'json' | 'executable';
}

interface HookEntry {
  command?: unknown;
  bash?: unknown;
  powershell?: unknown;
  hooks?: HookEntry[];
}

function commandsFromEntries(entries: unknown): string[] {
  if (!Array.isArray(entries)) return [];
  const commands: string[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as HookEntry;
    for (const value of [entry.command, entry.bash, entry.powershell]) {
      if (typeof value === 'string') commands.push(value);
    }
    commands.push(...commandsFromEntries(entry.hooks));
  }
  return commands;
}

function normalized(
  source: string,
  toolId: ToolId,
  events: string[],
  commands: string[],
  known: Set<string>,
  gates: Set<string>,
  feedback: Set<string>,
  hasRequiredMetadata: boolean,
  format: 'json' | 'executable' = 'json',
): NormalizedHooks {
  return {
    source,
    toolId,
    hasRequiredMetadata,
    events,
    gateEvents: events.filter((event) => gates.has(event)),
    feedbackEvents: events.filter((event) => feedback.has(event)),
    commands,
    unknownEvents: events.filter((event) => !known.has(event)),
    format,
  };
}

function normalizeFlatJson(
  artifact: HarnessArtifact,
  content: string,
  known: Set<string>,
  gates: Set<string>,
  feedback: Set<string>,
  requiresVersion: boolean,
): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const config = parsed as { version?: unknown; hooks?: Record<string, unknown> };
  const hooks = config.hooks && typeof config.hooks === 'object' ? config.hooks : {};
  const events = Object.keys(hooks);
  const commands = Object.values(hooks).flatMap(commandsFromEntries);
  return normalized(
    artifact.path,
    artifact.toolId,
    events,
    commands,
    known,
    gates,
    feedback,
    !requiresVersion || config.version !== undefined,
  );
}

function normalizeCline(artifact: HarnessArtifact): NormalizedHooks {
  const filename = artifact.path.split('/').at(-1) ?? '';
  const event = filename.replace(/\.ps1$/i, '');
  return normalized(
    artifact.path,
    artifact.toolId,
    [event],
    [`./${artifact.path}`],
    CLINE_KNOWN_EVENTS,
    new Set(['TaskStart', 'TaskResume', 'PreToolUse', 'UserPromptSubmit']),
    new Set(['TaskComplete', 'PostToolUse']),
    true,
    'executable',
  );
}

function normalizeKiro(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const config = parsed as { version?: unknown; hooks?: unknown };
  if (!Array.isArray(config.hooks)) return null;
  const events: string[] = [];
  const commands: string[] = [];
  for (const raw of config.hooks) {
    if (!raw || typeof raw !== 'object') continue;
    const hook = raw as { trigger?: unknown; action?: { type?: unknown; command?: unknown } };
    if (typeof hook.trigger === 'string') events.push(hook.trigger);
    if (hook.action?.type === 'command' && typeof hook.action.command === 'string') {
      commands.push(hook.action.command);
    }
  }
  return normalized(
    artifact.path,
    artifact.toolId,
    events,
    commands,
    KIRO_KNOWN_EVENTS,
    new Set(['PreToolUse', 'PreTaskExec', 'UserPromptSubmit']),
    new Set(['Stop', 'PostToolUse', 'PostTaskExec', 'PostFileCreate', 'PostFileSave', 'PostFileDelete']),
    config.version === 'v1',
  );
}

function normalizeAntigravity(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const events: string[] = [];
  const commands: string[] = [];
  for (const group of Object.values(parsed as Record<string, unknown>)) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) continue;
    for (const event of ['pre_tool_execution', 'post_tool_execution']) {
      const entries = (group as Record<string, unknown>)[event];
      if (!Array.isArray(entries)) continue;
      events.push(event);
      commands.push(...entries.flatMap((entry) => commandsFromEntries((entry as HookEntry | null)?.hooks)));
    }
  }
  return normalized(
    artifact.path,
    artifact.toolId,
    [...new Set(events)],
    commands,
    new Set(['pre_tool_execution', 'post_tool_execution']),
    new Set(['pre_tool_execution']),
    new Set(['post_tool_execution']),
    true,
  );
}

function normalizeArtifact(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  if (artifact.toolId === 'cline') return normalizeCline(artifact);
  if (artifact.toolId === 'kiro') return normalizeKiro(artifact, content);
  if (artifact.toolId === 'antigravity') return normalizeAntigravity(artifact, content);
  if (artifact.toolId === 'cursor') {
    return normalizeFlatJson(
      artifact,
      content,
      CURSOR_KNOWN_EVENTS,
      new Set(['beforeShellExecution', 'beforeMCPExecution', 'preToolUse', 'beforeReadFile']),
      new Set(['afterFileEdit', 'postToolUse', 'afterShellExecution', 'stop', 'afterAgentResponse']),
      true,
    );
  }
  if (artifact.toolId === 'copilot') {
    return normalizeFlatJson(
      artifact,
      content,
      COPILOT_KNOWN_EVENTS,
      new Set(['preToolUse', 'PreToolUse', 'permissionRequest']),
      new Set(['postToolUse', 'PostToolUse', 'agentStop', 'Stop', 'subagentStop', 'SubagentStop']),
      true,
    );
  }
  if (artifact.toolId === 'windsurf') {
    return normalizeFlatJson(
      artifact,
      content,
      WINDSURF_KNOWN_EVENTS,
      new Set(['pre_read_code', 'pre_write_code', 'pre_run_command', 'pre_mcp_tool_use', 'pre_user_prompt']),
      new Set([
        'post_read_code',
        'post_write_code',
        'post_run_command',
        'post_mcp_tool_use',
        'post_cascade_response',
        'post_cascade_response_with_transcript',
      ]),
      false,
    );
  }
  if (artifact.toolId === 'claude-code') {
    return normalizeFlatJson(
      artifact,
      content,
      CLAUDE_KNOWN_EVENTS,
      new Set(['PreToolUse', 'PermissionRequest', 'UserPromptSubmit']),
      new Set(['PostToolUse', 'PostToolUseFailure', 'PostToolBatch', 'Stop', 'SubagentStop']),
      false,
    );
  }
  if (artifact.toolId === 'gemini-cli') {
    return normalizeFlatJson(
      artifact,
      content,
      GEMINI_KNOWN_EVENTS,
      new Set(['BeforeAgent', 'BeforeModel', 'BeforeToolSelection', 'BeforeTool']),
      new Set(['AfterAgent', 'AfterModel', 'AfterTool']),
      false,
    );
  }
  return null;
}

function mergeHooks(current: NormalizedHooks | undefined, next: NormalizedHooks): NormalizedHooks {
  if (!current) return next;
  return {
    source: `${current.source}, ${next.source}`,
    toolId: current.toolId,
    hasRequiredMetadata: current.hasRequiredMetadata && next.hasRequiredMetadata,
    events: [...new Set([...current.events, ...next.events])],
    gateEvents: [...new Set([...current.gateEvents, ...next.gateEvents])],
    feedbackEvents: [...new Set([...current.feedbackEvents, ...next.feedbackEvents])],
    commands: [...current.commands, ...next.commands],
    unknownEvents: [...new Set([...current.unknownEvents, ...next.unknownEvents])],
    format: current.format === next.format ? current.format : 'json',
  };
}

/**
 * Normalize every recognized hook format, aggregate multi-file configs per
 * vendor, then return the strongest vendor configuration. OR semantics mean
 * adding a second harness can never lower the score.
 */
export function readNormalizedHookSets(ctx: ScanContext): NormalizedHooks[] {
  const byTool = new Map<ToolId, NormalizedHooks>();
  for (const artifact of collectHookConfigs(ctx)) {
    const content = ctx.read(artifact.path);
    if (content === null) continue;
    const next = normalizeArtifact(artifact, content);
    if (next) byTool.set(artifact.toolId, mergeHooks(byTool.get(artifact.toolId), next));
  }
  return [...byTool.values()].sort(
    (left, right) => right.events.length - left.events.length || left.toolId.localeCompare(right.toolId),
  );
}

export function hookCommandPathsResolve(
  commands: string[],
  has: (relPath: string) => boolean,
): { validated: number; missing: string[] } {
  const missing: string[] = [];
  let validated = 0;
  for (const command of commands) {
    const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    const pathTokens = tokens.filter(
      (token) => (token.includes('/') || token.includes('\\')) && !token.startsWith('-'),
    );
    if (pathTokens.length === 0) continue;
    validated += 1;
    const resolvable = pathTokens.some((token) => {
      const unquoted = token.replace(/^["']|["']$/g, '');
      const normalizedPath = unquoted.replace(/^\.\//, '').replace(/\\/g, '/').replace(/^\//, '');
      const stripped = normalizedPath.replace(/^\$\{[^}]+\}\/|^\$[A-Za-z_][A-Za-z0-9_]*\//, '');
      if (/(^|\/)node_modules\/\.bin\//.test(stripped)) return true;
      return has(stripped) || has(normalizedPath);
    });
    if (!resolvable) missing.push(command);
  }
  return { validated, missing };
}
