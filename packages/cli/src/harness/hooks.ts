import type { ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';
import { collectHookConfigs } from './collectors.js';

/** Events documented at cursor.com/docs — kept permissive on purpose. */
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

const CURSOR_GATE_EVENTS = new Set([
  'beforeShellExecution',
  'beforeMCPExecution',
  'preToolUse',
  'beforeReadFile',
]);

const CURSOR_FEEDBACK_EVENTS = new Set([
  'afterFileEdit',
  'postToolUse',
  'afterShellExecution',
  'stop',
  'afterAgentResponse',
]);

const CLAUDE_KNOWN_EVENTS = new Set(['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop']);

const CLAUDE_GATE_EVENTS = new Set(['PreToolUse']);
const CLAUDE_FEEDBACK_EVENTS = new Set(['PostToolUse']);

export interface NormalizedHooks {
  source: string;
  toolId: 'cursor' | 'claude-code';
  hasVersion: boolean;
  events: string[];
  gateEvents: string[];
  feedbackEvents: string[];
  commands: string[];
  unknownEvents: string[];
}

interface CursorHooksConfig {
  version?: unknown;
  hooks?: Record<string, Array<{ command?: unknown }>>;
}

interface ClaudeHookEntry {
  matcher?: unknown;
  hooks?: Array<{ type?: unknown; command?: unknown }>;
}

interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookEntry[]>;
}

function normalizeCursor(source: string, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === null || typeof parsed !== 'object') return null;
  const config = parsed as CursorHooksConfig;
  const events = config.hooks && typeof config.hooks === 'object' ? Object.keys(config.hooks) : [];
  const unknownEvents = events.filter((e) => !CURSOR_KNOWN_EVENTS.has(e));
  const gateEvents = events.filter((e) => CURSOR_GATE_EVENTS.has(e));
  const feedbackEvents = events.filter((e) => CURSOR_FEEDBACK_EVENTS.has(e));
  const commands: string[] = [];
  if (config.hooks) {
    for (const handlers of Object.values(config.hooks)) {
      if (!Array.isArray(handlers)) continue;
      for (const handler of handlers) {
        if (handler && typeof handler.command === 'string') commands.push(handler.command);
      }
    }
  }
  return {
    source,
    toolId: 'cursor',
    hasVersion: config.version !== undefined,
    events,
    gateEvents,
    feedbackEvents,
    commands,
    unknownEvents,
  };
}

function normalizeClaude(source: string, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === null || typeof parsed !== 'object') return null;
  const settings = parsed as ClaudeSettings;
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    return {
      source,
      toolId: 'claude-code',
      hasVersion: true,
      events: [],
      gateEvents: [],
      feedbackEvents: [],
      commands: [],
      unknownEvents: [],
    };
  }
  const events = Object.keys(settings.hooks);
  const unknownEvents = events.filter((e) => !CLAUDE_KNOWN_EVENTS.has(e));
  const gateEvents = events.filter((e) => CLAUDE_GATE_EVENTS.has(e));
  const feedbackEvents = events.filter((e) => CLAUDE_FEEDBACK_EVENTS.has(e));
  const commands: string[] = [];
  for (const handlers of Object.values(settings.hooks)) {
    if (!Array.isArray(handlers)) continue;
    for (const entry of handlers) {
      if (!entry?.hooks) continue;
      for (const hook of entry.hooks) {
        if (hook && typeof hook.command === 'string') commands.push(hook.command);
      }
    }
  }
  return {
    source,
    toolId: 'claude-code',
    hasVersion: true,
    events,
    gateEvents,
    feedbackEvents,
    commands,
    unknownEvents,
  };
}

/** First parseable hooks config wins (OR across tools). */
export function readNormalizedHooks(ctx: ScanContext): NormalizedHooks | null {
  for (const artifact of collectHookConfigs(ctx)) {
    const content = ctx.read(artifact.path);
    if (content === null) continue;
    if (artifact.toolId === 'cursor') {
      const normalized = normalizeCursor(artifact.path, content);
      if (normalized) return normalized;
    }
    if (artifact.toolId === 'claude-code') {
      const normalized = normalizeClaude(artifact.path, content);
      if (normalized) return normalized;
    }
  }
  return null;
}

export function hookCommandPathsResolve(
  commands: string[],
  has: (relPath: string) => boolean,
): { validated: number; missing: string[] } {
  const missing: string[] = [];
  let validated = 0;
  for (const command of commands) {
    const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    const pathTokens = tokens.filter((t) => (t.includes('/') || t.includes('\\')) && !t.startsWith('-'));
    if (pathTokens.length === 0) continue;
    validated += 1;
    const resolvable = pathTokens.some((t) => {
      const unquoted = t.replace(/^["']|["']$/g, '');
      const normalized = unquoted.replace(/^\.[\\/]/, '').replace(/\\/g, '/');
      // Claude uses ${CLAUDE_PROJECT_DIR}/.claude/hooks/... — strip env prefix for resolution.
      const stripped = normalized.replace(/^\$\{[^}]+\}\//, '');
      return has(stripped) || has(normalized);
    });
    if (!resolvable) missing.push(command);
  }
  return { validated, missing };
}
