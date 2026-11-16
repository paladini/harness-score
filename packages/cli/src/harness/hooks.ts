import * as path from 'node:path';
import type { ScanContext, ScanDiagnostic } from '../types.js';
import { compareLexically, safeJsonParse } from '../util.js';
import { collectHookConfigs, type HarnessArtifact } from './collectors.js';

/** Events documented at cursor.com/docs - kept permissive on purpose. */
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

/** Claude Code hook events documented at code.claude.com/docs/en/hooks on 2026-08-12. */
const CLAUDE_KNOWN_EVENTS = new Set([
  'SessionStart',
  'Setup',
  'InstructionsLoaded',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'MessageDisplay',
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'PermissionDenied',
  'Notification',
  'SubagentStart',
  'SubagentStop',
  'TaskCreated',
  'TaskCompleted',
  'Stop',
  'StopFailure',
  'TeammateIdle',
  'ConfigChange',
  'CwdChanged',
  'DirectoryAdded',
  'FileChanged',
  'WorktreeCreate',
  'WorktreeRemove',
  'PreCompact',
  'PostCompact',
  'SessionEnd',
  'Elicitation',
  'ElicitationResult',
]);

const CLAUDE_GATE_EVENTS = new Set(['PreToolUse', 'PermissionRequest']);
const CLAUDE_FEEDBACK_EVENTS = new Set([
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Stop',
  'StopFailure',
]);
const CLAUDE_HANDLER_TYPES = new Set(['command', 'http', 'mcp_tool', 'prompt', 'agent']);

const DEVIN_KNOWN_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'PermissionRequest',
  'UserPromptSubmit',
  'Stop',
  'PostCompaction',
  'SessionStart',
  'SessionEnd',
]);
const DEVIN_GATE_EVENTS = new Set(['PreToolUse', 'PermissionRequest']);
const DEVIN_FEEDBACK_EVENTS = new Set(['PostToolUse', 'Stop']);
const DEVIN_HANDLER_TYPES = new Set(['command', 'prompt']);
const COPILOT_KNOWN_EVENTS = new Set([
  'sessionStart',
  'sessionEnd',
  'userPromptSubmitted',
  'userPromptTransformed',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'permissionRequest',
  'preCompact',
  'agentStop',
  'subagentStart',
  'subagentStop',
  'errorOccurred',
  'notification',
]);
const COPILOT_GATE_EVENTS = new Set(['preToolUse', 'permissionRequest']);
const COPILOT_FEEDBACK_EVENTS = new Set(['postToolUse', 'postToolUseFailure', 'agentStop', 'subagentStop']);
const CODEX_KNOWN_EVENTS = new Set([
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'PostToolUseFailure',
  'SubagentStart',
  'SubagentStop',
  'Stop',
  'PreCompact',
  'PostCompact',
  'SessionEnd',
  'TurnComplete',
  'Notification',
  'AfterAgent',
]);
const CODEX_GATE_EVENTS = new Set(['PreToolUse', 'PermissionRequest']);
const CODEX_FEEDBACK_EVENTS = new Set([
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'TurnComplete',
  'AfterAgent',
]);

type HookToolId = HarnessArtifact['toolId'];
type VersionRequirement = 'present' | 'not-required' | 'missing';

export interface HookCommandInvocation {
  command: string;
  args: string[];
}

export interface NormalizedHooks {
  source: string;
  canonicalSource: string;
  nativeDepth: number;
  toolId: HookToolId;
  hasEventMap: boolean;
  versionRequirement: VersionRequirement;
  events: string[];
  gateEvents: string[];
  feedbackEvents: string[];
  commands: HookCommandInvocation[];
  handlerCount: number;
  structuralErrors: string[];
  selectionWarnings: ScanDiagnostic[];
  eventWarnings: ScanDiagnostic[];
}

function stringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  return value as string[];
}

function unknownEventWarnings(source: string, events: string[], knownEvents: Set<string>): ScanDiagnostic[] {
  return events
    .filter((event) => event.length > 0 && !knownEvents.has(event))
    .map((event) => ({
      code: 'unknown-hook-event',
      source,
      message: `${event} is structurally valid but is not in this harness-score version's event catalog.`,
    }));
}

function baseNormalized(
  artifact: HarnessArtifact,
  toolId: HookToolId,
): Omit<NormalizedHooks, 'hasEventMap' | 'versionRequirement' | 'events' | 'gateEvents' | 'feedbackEvents'> {
  return {
    source: artifact.path,
    canonicalSource: artifact.canonicalPath,
    nativeDepth: artifact.nativeDepth,
    toolId,
    commands: [],
    handlerCount: 0,
    structuralErrors: [],
    selectionWarnings: [],
    eventWarnings: [],
  };
}

function normalizeCursor(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === null || typeof parsed !== 'object') return null;
  const config = parsed as Record<string, unknown>;
  const hooks = config.hooks;
  const hasEventMap = hooks !== null && typeof hooks === 'object' && !Array.isArray(hooks);
  const events = hasEventMap ? Object.keys(hooks as Record<string, unknown>) : [];
  const normalized: NormalizedHooks = {
    ...baseNormalized(artifact, 'cursor'),
    hasEventMap,
    versionRequirement: config.version === undefined ? 'missing' : 'present',
    events,
    gateEvents: events.filter((event) => CURSOR_GATE_EVENTS.has(event)),
    feedbackEvents: events.filter((event) => CURSOR_FEEDBACK_EVENTS.has(event)),
    eventWarnings: unknownEventWarnings(artifact.path, events, CURSOR_KNOWN_EVENTS),
  };

  if (!hasEventMap) {
    normalized.structuralErrors.push('hooks must be an object.');
    return normalized;
  }

  for (const [event, handlers] of Object.entries(hooks as Record<string, unknown>)) {
    if (event.length === 0) normalized.structuralErrors.push('Hook event names must not be empty.');
    if (!Array.isArray(handlers) || handlers.length === 0) {
      normalized.structuralErrors.push(`${event || '<empty>'} handlers must be a non-empty array.`);
      continue;
    }
    for (const handler of handlers) {
      if (!handler || typeof handler !== 'object' || Array.isArray(handler)) {
        normalized.structuralErrors.push(`${event || '<empty>'} contains a non-object handler.`);
        continue;
      }
      const value = handler as Record<string, unknown>;
      const args = stringArray(value.args);
      if (typeof value.command !== 'string' || value.command.trim().length === 0 || args === null) {
        normalized.structuralErrors.push(`${event || '<empty>'} contains an invalid command handler.`);
        continue;
      }
      normalized.handlerCount += 1;
      normalized.commands.push({ command: value.command, args });
    }
  }
  return normalized;
}

function validateClaudeHandler(
  event: string,
  value: Record<string, unknown>,
  normalized: NormalizedHooks,
): void {
  if (typeof value.type !== 'string' || !CLAUDE_HANDLER_TYPES.has(value.type)) {
    normalized.structuralErrors.push(`${event} contains a handler with an unknown or missing type.`);
    return;
  }

  if (value.type === 'command') {
    const args = stringArray(value.args);
    if (typeof value.command !== 'string' || value.command.trim().length === 0 || args === null) {
      normalized.structuralErrors.push(`${event} contains an invalid command handler.`);
      return;
    }
    normalized.commands.push({ command: value.command, args });
  } else if (value.type === 'http') {
    if (typeof value.url !== 'string' || value.url.trim().length === 0) {
      normalized.structuralErrors.push(`${event} contains an HTTP handler without a URL.`);
      return;
    }
  } else if (value.type === 'mcp_tool') {
    if (
      typeof value.server !== 'string' ||
      value.server.trim().length === 0 ||
      typeof value.tool !== 'string' ||
      value.tool.trim().length === 0
    ) {
      normalized.structuralErrors.push(`${event} contains an MCP handler without server/tool.`);
      return;
    }
  } else if (typeof value.prompt !== 'string' || value.prompt.trim().length === 0) {
    normalized.structuralErrors.push(`${event} contains a ${value.type} handler without a prompt.`);
    return;
  }

  normalized.handlerCount += 1;
}

function validateMatcherGroups(
  event: string,
  groups: unknown,
  normalized: NormalizedHooks,
  validateHandler: (event: string, value: Record<string, unknown>, normalized: NormalizedHooks) => void,
): void {
  const eventName = event || '<empty>';
  if (!Array.isArray(groups) || groups.length === 0) {
    normalized.structuralErrors.push(`${eventName} matcher groups must be a non-empty array.`);
    return;
  }
  for (const group of groups) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      normalized.structuralErrors.push(`${eventName} contains a non-object matcher group.`);
      continue;
    }
    const handlers = (group as Record<string, unknown>).hooks;
    if (!Array.isArray(handlers) || handlers.length === 0) {
      normalized.structuralErrors.push(`${eventName} matcher group must contain a non-empty hooks array.`);
      continue;
    }
    for (const handler of handlers) {
      if (!handler || typeof handler !== 'object' || Array.isArray(handler)) {
        normalized.structuralErrors.push(`${eventName} contains a non-object handler.`);
        continue;
      }
      validateHandler(eventName, handler as Record<string, unknown>, normalized);
    }
  }
}

function normalizeClaude(
  artifact: HarnessArtifact,
  content: string,
  toolId: 'claude-code' | 'codex' = 'claude-code',
): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === null || typeof parsed !== 'object') return null;
  const settings = parsed as Record<string, unknown>;
  const hooks = settings.hooks;
  const hasEventMap = hooks !== null && typeof hooks === 'object' && !Array.isArray(hooks);
  const events = hasEventMap ? Object.keys(hooks as Record<string, unknown>) : [];
  const normalized: NormalizedHooks = {
    ...baseNormalized(artifact, toolId),
    hasEventMap,
    versionRequirement: 'not-required',
    events,
    gateEvents: events.filter((event) =>
      (toolId === 'codex' ? CODEX_GATE_EVENTS : CLAUDE_GATE_EVENTS).has(event),
    ),
    feedbackEvents: events.filter((event) =>
      (toolId === 'codex' ? CODEX_FEEDBACK_EVENTS : CLAUDE_FEEDBACK_EVENTS).has(event),
    ),
    eventWarnings: unknownEventWarnings(
      artifact.path,
      events,
      toolId === 'codex' ? CODEX_KNOWN_EVENTS : CLAUDE_KNOWN_EVENTS,
    ),
  };

  if (!hasEventMap) {
    normalized.structuralErrors.push('hooks must be an object.');
    return normalized;
  }

  for (const [event, groups] of Object.entries(hooks as Record<string, unknown>)) {
    if (event.length === 0) normalized.structuralErrors.push('Hook event names must not be empty.');
    validateMatcherGroups(event, groups, normalized, validateClaudeHandler);
  }
  return normalized;
}

function normalizeCopilot(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const config = parsed as Record<string, unknown>;
  const hooks = config.hooks;
  const hasEventMap = hooks !== null && typeof hooks === 'object' && !Array.isArray(hooks);
  const events = hasEventMap ? Object.keys(hooks as Record<string, unknown>) : [];
  const normalized: NormalizedHooks = {
    ...baseNormalized(artifact, 'copilot'),
    hasEventMap,
    versionRequirement: config.version === 1 ? 'present' : 'missing',
    events,
    gateEvents: events.filter((event) => COPILOT_GATE_EVENTS.has(event)),
    feedbackEvents: events.filter((event) => COPILOT_FEEDBACK_EVENTS.has(event)),
    eventWarnings: unknownEventWarnings(artifact.path, events, COPILOT_KNOWN_EVENTS),
  };
  if (!hasEventMap) {
    normalized.structuralErrors.push('hooks must be an object.');
    return normalized;
  }
  for (const [event, handlers] of Object.entries(hooks as Record<string, unknown>)) {
    if (!Array.isArray(handlers) || handlers.length === 0) {
      normalized.structuralErrors.push(`${event} handlers must be a non-empty array.`);
      continue;
    }
    for (const handler of handlers) {
      if (!handler || typeof handler !== 'object' || Array.isArray(handler)) {
        normalized.structuralErrors.push(`${event} contains a non-object handler.`);
        continue;
      }
      const value = handler as Record<string, unknown>;
      const type = value.type ?? 'command';
      if (type === 'command') {
        const command = [value.exec, value.command, value.bash, value.powershell].find(
          (candidate) => typeof candidate === 'string' && candidate.trim().length > 0,
        );
        const args = stringArray(value.args);
        if (typeof command !== 'string' || args === null) {
          normalized.structuralErrors.push(`${event} contains an invalid command handler.`);
          continue;
        }
        normalized.commands.push({ command, args });
      } else if (type === 'http') {
        if (typeof value.url !== 'string' || value.url.trim().length === 0) {
          normalized.structuralErrors.push(`${event} contains an HTTP handler without a URL.`);
          continue;
        }
      } else if (type === 'prompt') {
        if (typeof value.prompt !== 'string' || value.prompt.trim().length === 0) {
          normalized.structuralErrors.push(`${event} contains a prompt handler without a prompt.`);
          continue;
        }
      } else {
        normalized.structuralErrors.push(`${event} contains an unsupported hook type.`);
        continue;
      }
      normalized.handlerCount += 1;
    }
  }
  return normalized;
}

function stripTomlComment(line: string): string {
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (quote === '"' && character === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    if (quote && character === quote && !escaped) quote = null;
    else if (!quote && (character === '"' || character === "'")) quote = character;
    else if (!quote && character === '#') return line.slice(0, index);
    escaped = false;
  }
  return line;
}

function tomlValue(source: string): unknown {
  const value = source.trim();
  if (value.startsWith('"') && value.endsWith('"')) return safeJsonParse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  if (value.startsWith('[') && value.endsWith(']')) return safeJsonParse(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

/** Parse the documented Codex [[hooks.Event]] TOML subset without a runtime dependency. */
function normalizeCodexToml(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const hooks: Record<string, Array<Record<string, unknown>>> = {};
  let currentGroup: Record<string, unknown> | null = null;
  let currentHandler: Record<string, unknown> | null = null;
  let target: Record<string, unknown> | null = null;
  let foundHooksTable = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) continue;
    const section = line.match(/^\[\[hooks\.([A-Za-z][\w]*)(?:\.(hooks))?\]\]$/);
    if (section) {
      foundHooksTable = true;
      const event = section[1]!;
      const eventGroups = hooks[event] ?? [];
      hooks[event] = eventGroups;
      if (section[2]) {
        if (!currentGroup || !eventGroups.includes(currentGroup)) {
          currentGroup = {};
          eventGroups.push(currentGroup);
        }
        currentHandler = {};
        const groupHandlers = (currentGroup.hooks ?? []) as Record<string, unknown>[];
        currentGroup.hooks = groupHandlers;
        groupHandlers.push(currentHandler);
        target = currentHandler;
      } else {
        currentGroup = {};
        eventGroups.push(currentGroup);
        currentHandler = null;
        target = currentGroup;
      }
      continue;
    }
    const assignment = line.match(/^([A-Za-z_][\w-]*)\s*=\s*(.+)$/);
    if (!assignment || !target) continue;
    const value = tomlValue(assignment[2]!);
    if (value !== undefined) target[assignment[1]!] = value;
  }

  if (!foundHooksTable) return null;
  return normalizeClaude(artifact, JSON.stringify({ hooks }), 'codex');
}

function validateDevinHandler(
  event: string,
  value: Record<string, unknown>,
  normalized: NormalizedHooks,
): void {
  if (typeof value.type !== 'string' || !DEVIN_HANDLER_TYPES.has(value.type)) {
    normalized.structuralErrors.push(`${event} contains a handler with an unknown or missing type.`);
    return;
  }
  if (value.type === 'command') {
    if (typeof value.command !== 'string' || value.command.trim().length === 0) {
      normalized.structuralErrors.push(`${event} contains an invalid command handler.`);
      return;
    }
    normalized.commands.push({ command: value.command, args: [] });
  } else if (typeof value.prompt !== 'string' || value.prompt.trim().length === 0) {
    normalized.structuralErrors.push(`${event} contains a prompt handler without a prompt.`);
    return;
  }
  normalized.handlerCount += 1;
}

function normalizeDevinEventMap(
  artifact: HarnessArtifact,
  hooks: Record<string, unknown>,
  hasEventMap: boolean,
): NormalizedHooks {
  const events = hasEventMap ? Object.keys(hooks) : [];
  const normalized: NormalizedHooks = {
    ...baseNormalized(artifact, 'devin'),
    hasEventMap,
    versionRequirement: 'not-required',
    events,
    gateEvents: events.filter((event) => DEVIN_GATE_EVENTS.has(event)),
    feedbackEvents: events.filter((event) => DEVIN_FEEDBACK_EVENTS.has(event)),
    eventWarnings: unknownEventWarnings(artifact.path, events, DEVIN_KNOWN_EVENTS),
  };
  if (!hasEventMap) {
    normalized.structuralErrors.push('The root value must be an event map object.');
    return normalized;
  }
  for (const [event, groups] of Object.entries(hooks)) {
    if (event.length === 0) normalized.structuralErrors.push('Hook event names must not be empty.');
    validateMatcherGroups(event, groups, normalized, validateDevinHandler);
  }
  return normalized;
}

function normalizeDevinStandalone(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === undefined) return null;
  const hasEventMap = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  const hooks = hasEventMap ? (parsed as Record<string, unknown>) : {};
  return normalizeDevinEventMap(artifact, hooks, hasEventMap);
}

function normalizeDevinConfig(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  const parsed = safeJsonParse(content);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const config = parsed as Record<string, unknown>;
  const hooks = config.hooks;
  const hasEventMap = hooks !== null && typeof hooks === 'object' && !Array.isArray(hooks);
  if (!hasEventMap) {
    const normalized: NormalizedHooks = {
      ...baseNormalized(artifact, 'devin'),
      hasEventMap: false,
      versionRequirement: 'not-required',
      events: [],
      gateEvents: [],
      feedbackEvents: [],
      eventWarnings: [],
    };
    normalized.structuralErrors.push('hooks must be an object.');
    return normalized;
  }
  return normalizeDevinEventMap(artifact, hooks as Record<string, unknown>, true);
}

function isDevinConfigJson(artifact: HarnessArtifact): boolean {
  return (
    artifact.canonicalPath.endsWith('/.devin/config.json') || artifact.canonicalPath === '.devin/config.json'
  );
}

function normalizeArtifact(artifact: HarnessArtifact, content: string): NormalizedHooks | null {
  if (artifact.toolId === 'cursor') return normalizeCursor(artifact, content);
  if (artifact.toolId === 'claude-code') return normalizeClaude(artifact, content);
  if (artifact.toolId === 'codex') {
    return artifact.canonicalPath.endsWith('/config.toml')
      ? normalizeCodexToml(artifact, content)
      : normalizeClaude(artifact, content, 'codex');
  }
  if (artifact.toolId === 'copilot') return normalizeCopilot(artifact, content);
  if (artifact.toolId === 'devin') {
    return isDevinConfigJson(artifact)
      ? normalizeDevinConfig(artifact, content)
      : normalizeDevinStandalone(artifact, content);
  }
  return null;
}

function unusableArtifact(artifact: HarnessArtifact, problem: string): NormalizedHooks {
  return {
    ...baseNormalized(artifact, artifact.toolId),
    hasEventMap: false,
    versionRequirement:
      artifact.toolId === 'claude-code' || artifact.toolId === 'devin' ? 'not-required' : 'missing',
    events: [],
    gateEvents: [],
    feedbackEvents: [],
    structuralErrors: [problem],
  };
}

function isValidCandidate(candidate: NormalizedHooks): boolean {
  return (
    candidate.hasEventMap &&
    candidate.versionRequirement !== 'missing' &&
    candidate.events.length > 0 &&
    candidate.structuralErrors.length === 0
  );
}

/** Select the closest non-empty valid hook configuration with deterministic tie-breakers. */
export function readNormalizedHooks(ctx: ScanContext): NormalizedHooks | null {
  const candidates: NormalizedHooks[] = [];
  const selectionWarnings: ScanDiagnostic[] = [];
  for (const artifact of collectHookConfigs(ctx)) {
    const content = ctx.read(artifact.path);
    if (content === null) {
      candidates.push(unusableArtifact(artifact, 'Hook configuration could not be read.'));
      continue;
    }
    const normalized = normalizeArtifact(artifact, content);
    if (!normalized) {
      candidates.push(unusableArtifact(artifact, 'Hook configuration is not valid JSON.'));
      continue;
    }
    candidates.push(normalized);
  }
  if (candidates.length === 0) return null;

  const validWithEvents = candidates.filter(isValidCandidate);
  const withEvents = candidates.filter((candidate) => candidate.events.length > 0);
  const pool = validWithEvents.length > 0 ? validWithEvents : withEvents.length > 0 ? withEvents : candidates;
  pool.sort(
    (a, b) =>
      a.nativeDepth - b.nativeDepth ||
      b.events.length - a.events.length ||
      compareLexically(a.canonicalSource, b.canonicalSource),
  );
  const best = pool[0]!;
  for (const candidate of candidates) {
    if (candidate === best) continue;
    selectionWarnings.push({
      code: 'ignored-hook-config',
      source: candidate.source,
      message: !isValidCandidate(candidate)
        ? `Invalid or empty hook configuration was ignored in favor of ${best.source}.`
        : `Hook configuration was not selected; ${best.source} has higher precedence.`,
    });
  }
  if (!isValidCandidate(best)) {
    selectionWarnings.push({
      code: 'invalid-hook-config',
      source: best.source,
      message: `No valid hook configuration was available: ${best.structuralErrors.join(' ') || 'the configuration is empty or missing required metadata.'}`,
    });
  }
  selectionWarnings.sort(
    (a, b) => compareLexically(a.source ?? '', b.source ?? '') || compareLexically(a.code, b.code),
  );
  return { ...best, selectionWarnings };
}

function shellTokens(value: string): string[] {
  return value.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
}

function extractCanonicalDevinJoins(value: string): { paths: string[]; remainder: string } {
  const pattern =
    /(^|[^\w.])os\.path\.join\(\s*os\.environ\[\s*(['"])DEVIN_PROJECT_DIR\2\s*\]((?:\s*,\s*(?:"[^"]*"|'[^']*'))+)\s*\)(?=$|[^\w.])/g;
  const paths: string[] = [];
  for (const match of value.matchAll(pattern)) {
    const literalArguments = match[3] ?? '';
    const segments = [...literalArguments.matchAll(/,\s*(?:"([^"]*)"|'([^']*)')/g)].map(
      (segment) => segment[1] ?? segment[2] ?? '',
    );
    paths.push(`./${segments.join('/')}`);
  }
  return { paths, remainder: value.replace(pattern, '$1') };
}

function invocationPathValues(invocation: HookCommandInvocation): string[] {
  const command = extractCanonicalDevinJoins(invocation.command);
  const args = invocation.args.map(extractCanonicalDevinJoins);
  const literals = [...command.paths, ...args.flatMap((value) => value.paths)];
  const tokens =
    invocation.args.length === 0
      ? shellTokens(command.remainder)
      : [command.remainder, ...args.flatMap((value) => shellTokens(value.remainder))];
  return [...literals, ...tokens.filter((token) => token.trim().length > 0)];
}

function pathValue(token: string): string {
  const unquoted = token.replace(/^["']|["']$/g, '');
  const assignment = unquoted.match(/^--?[^=]+=([\s\S]+)$/);
  return (assignment?.[1] ?? unquoted).replace(/^["']|["']$/g, '').replace(/[,;]$/, '');
}

function isRepositoryPath(token: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(token)) return false;
  if (/^[A-Za-z]:\//.test(token) || token.startsWith('/')) return false;
  if (/^\$\{(?!(?:CLAUDE|DEVIN)_PROJECT_DIR\})[^}]+\}\//.test(token)) return false;
  if (/^\$(?!(?:CLAUDE|DEVIN)_PROJECT_DIR\/)[A-Za-z_][A-Za-z0-9_]*\//.test(token)) return false;
  return (
    token.startsWith('./') ||
    token.startsWith('../') ||
    token.startsWith('${CLAUDE_PROJECT_DIR}/') ||
    token.startsWith('$CLAUDE_PROJECT_DIR/') ||
    token.startsWith('${DEVIN_PROJECT_DIR}/') ||
    token.startsWith('$DEVIN_PROJECT_DIR/') ||
    token.includes('/')
  );
}

function resolvesPathToken(token: string, ctx: ScanContext): boolean | null {
  const value = pathValue(token).replace(/\\/g, '/');
  if (!isRepositoryPath(value)) return null;
  const normalized = value.replace(/^\.\//, '');
  const stripped = normalized
    .replace(/^\$\{(?:CLAUDE|DEVIN)_PROJECT_DIR\}\//, '')
    .replace(/^\$(?:CLAUDE|DEVIN)_PROJECT_DIR\//, '')
    .replace(/^\.\//, '');
  if (/(^|\/)node_modules\/\.bin\//.test(stripped)) return true;

  const candidates = new Set([normalized, stripped]);
  const rootName = path.basename(ctx.root);
  for (const candidate of [...candidates]) {
    if (candidate.startsWith(`${rootName}/`)) candidates.add(candidate.slice(rootName.length + 1));
  }
  return [...candidates].some((candidate) => ctx.has(candidate));
}

export function hookCommandPathsResolve(
  invocations: HookCommandInvocation[],
  ctx: ScanContext,
): { validated: number; missing: string[] } {
  const missing: string[] = [];
  let validated = 0;
  for (const invocation of invocations) {
    for (const token of invocationPathValues(invocation)) {
      const resolved = resolvesPathToken(token, ctx);
      if (resolved === null) continue;
      validated += 1;
      if (!resolved) missing.push(pathValue(token));
    }
  }
  return { validated, missing };
}
