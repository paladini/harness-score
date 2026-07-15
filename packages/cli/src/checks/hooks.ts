import { hookCommandPathsResolve, readNormalizedHooks } from '../harness/hooks.js';
import type { Check } from '../types.js';

export const hookChecks: Check[] = [
  {
    id: 'HKS-01',
    dimension: 'hooks',
    title: 'Hooks configuration present and valid JSON',
    points: 4,
    remediation:
      'Create a hooks configuration (.cursor/hooks.json or .claude/settings.json hooks key) — hooks are the harness layer that can observe and control the agent loop deterministically.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return {
          passed: false,
          evidence: 'No .cursor/hooks.json or .claude/settings.json hooks configuration found.',
        };
      }
      return { passed: true, evidence: `${hooks.source} parses as JSON.` };
    },
  },
  {
    id: 'HKS-02',
    dimension: 'hooks',
    title: 'Hooks use known events and a version field',
    points: 2,
    remediation:
      'Register handlers only on documented events for your tool (Cursor: beforeShellExecution, afterFileEdit, …; Claude Code: PreToolUse, PostToolUse, …) — typos fail silently.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return { passed: false, evidence: 'No parseable hooks configuration.' };
      }
      const passed = hooks.hasVersion && hooks.events.length > 0 && hooks.unknownEvents.length === 0;
      return {
        passed,
        evidence:
          hooks.events.length === 0
            ? `${hooks.source} has no registered events.`
            : hooks.unknownEvents.length > 0
              ? `Unknown event name(s): ${hooks.unknownEvents.join(', ')}`
              : `${hooks.source}: events: ${hooks.events.join(', ')}.`,
      };
    },
  },
  {
    id: 'HKS-03',
    dimension: 'hooks',
    title: 'Gate hook guards risky operations',
    points: 4,
    remediation:
      'Register a gate hook (Cursor: beforeShellExecution / beforeMCPExecution / preToolUse; Claude Code: PreToolUse) that returns allow/deny/ask for destructive operations.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return { passed: false, evidence: 'No parseable hooks configuration.' };
      }
      return hooks.gateEvents.length > 0
        ? { passed: true, evidence: `Gate hook(s) registered on: ${hooks.gateEvents.join(', ')}.` }
        : {
            passed: false,
            evidence: `No gate hooks registered in ${hooks.source}.`,
          };
    },
  },
  {
    id: 'HKS-04',
    dimension: 'hooks',
    title: 'Feedback hook observes agent output',
    points: 2,
    remediation:
      'Register a feedback hook (Cursor: afterFileEdit / postToolUse / stop; Claude Code: PostToolUse) — e.g. auto-format edited files or run a quick lint.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return { passed: false, evidence: 'No parseable hooks configuration.' };
      }
      return hooks.feedbackEvents.length > 0
        ? {
            passed: true,
            evidence: `Feedback hook(s) registered on: ${hooks.feedbackEvents.join(', ')}.`,
          }
        : {
            passed: false,
            evidence: `No feedback hooks registered in ${hooks.source}.`,
          };
    },
  },
  {
    id: 'HKS-05',
    dimension: 'hooks',
    title: 'Hook scripts exist in the repository',
    points: 2,
    remediation:
      'Commit the scripts referenced by your hooks config — a hook pointing at a missing script fails open on every machine but yours.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return { passed: false, evidence: 'No parseable hooks configuration.' };
      }
      if (hooks.commands.length === 0) {
        return { passed: false, evidence: 'No hook commands declared.' };
      }
      const { validated, missing } = hookCommandPathsResolve(hooks.commands, (p) => ctx.has(p));
      if (validated === 0) {
        return {
          passed: true,
          evidence: 'Hook commands do not reference in-repo paths (nothing to resolve).',
        };
      }
      return missing.length === 0
        ? {
            passed: true,
            evidence: `All ${validated} path-referencing hook command(s) resolve to committed files.`,
          }
        : { passed: false, evidence: `Hook command(s) reference missing files: ${missing.join(' | ')}` };
    },
  },
];
