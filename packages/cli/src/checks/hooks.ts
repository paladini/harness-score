import { hookCommandPathsResolve, readNormalizedHooks } from '../harness/hooks.js';
import type { Check } from '../types.js';

export const hookChecks: Check[] = [
  {
    id: 'HKS-01',
    dimension: 'hooks',
    title: 'Hooks configuration present and valid JSON',
    points: 4,
    remediation:
      'Create a hooks configuration (.cursor/hooks.json, .claude/settings.json hooks key, .github/hooks/*.json, .codex/hooks.json, or Devin .devin/hooks.v1.json) — hooks are the harness layer that can observe and control the agent loop deterministically.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return {
          passed: false,
          evidence:
            'No .cursor/hooks.json, .claude/settings.json hooks key, .github/hooks/*.json, .codex/hooks.json, plugin hooks/hooks.json, or Devin hooks config found.',
        };
      }
      if (!hooks.hasEventMap) {
        return {
          passed: false,
          evidence: `${hooks.source}: ${hooks.structuralErrors[0] ?? 'hooks object is missing.'}`,
          warnings: hooks.selectionWarnings,
        };
      }
      return {
        passed: true,
        evidence: `${hooks.source} contains a parseable hooks configuration.`,
        warnings: hooks.selectionWarnings,
      };
    },
  },
  {
    id: 'HKS-02',
    dimension: 'hooks',
    title: 'Hook events and handlers are structurally valid',
    points: 2,
    remediation:
      'Declare at least one structurally valid hook event and every metadata field required by your tool; unrecognized future events are reported as warnings.',
    run(ctx) {
      const hooks = readNormalizedHooks(ctx);
      if (!hooks) {
        return { passed: false, evidence: 'No parseable hooks configuration.' };
      }
      const passed =
        hooks.versionRequirement !== 'missing' &&
        hooks.events.length > 0 &&
        hooks.structuralErrors.length === 0;
      return {
        passed,
        evidence:
          hooks.events.length === 0
            ? `${hooks.source} has no registered events.`
            : hooks.structuralErrors.length > 0
              ? `${hooks.source}: ${hooks.structuralErrors.join(' ')}`
              : hooks.versionRequirement === 'missing'
                ? `${hooks.source} is missing required version metadata.`
                : `${hooks.source}: events: ${hooks.events.join(', ')}.`,
        warnings: hooks.eventWarnings,
      };
    },
  },
  {
    id: 'HKS-03',
    dimension: 'hooks',
    title: 'Gate hook guards risky operations',
    points: 4,
    remediation:
      'Register a gate hook (Cursor: beforeShellExecution / beforeMCPExecution / preToolUse / beforeReadFile; Claude Code, Codex, Devin, or Copilot: PreToolUse / PermissionRequest / preToolUse) that guards destructive operations.',
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
      'Register a feedback hook (Cursor: afterFileEdit / postToolUse / stop; Claude Code/Codex: PostToolUse; Devin: PostToolUse / Stop; Copilot: postToolUse / agentStop) — e.g. auto-format edited files or run a quick lint.',
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
        return hooks.handlerCount > 0
          ? {
              passed: true,
              evidence: 'Valid non-command hook handlers declare no repository scripts to resolve.',
            }
          : { passed: false, evidence: 'No valid hook handlers declared.' };
      }
      const { validated, missing } = hookCommandPathsResolve(hooks.commands, ctx);
      if (validated === 0) {
        return {
          passed: true,
          evidence: 'Hook commands do not reference in-repo paths (nothing to resolve).',
        };
      }
      return missing.length === 0
        ? {
            passed: true,
            evidence: `All ${validated} repository path reference(s) resolve to committed files.`,
          }
        : { passed: false, evidence: `Hook command path(s) reference missing files: ${missing.join(' | ')}` };
    },
  },
];
