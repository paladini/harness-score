import { hookCommandPathsResolve, readNormalizedHookSets } from '../harness/hooks.js';
import type { Check, ScanContext } from '../types.js';

function hookSets(ctx: ScanContext) {
  return readNormalizedHookSets(ctx);
}

export const hookChecks: Check[] = [
  {
    id: 'HKS-01',
    dimension: 'hooks',
    title: 'Recognized hooks configuration is valid',
    points: 4,
    remediation:
      'Create a recognized repository hooks configuration or executable hook script for deterministic control of the agent loop.',
    run(ctx) {
      const hooks = hookSets(ctx).find((candidate) => candidate.events.length > 0);
      if (!hooks) {
        return { passed: false, evidence: 'No valid recognized repository hooks configuration found.' };
      }
      return {
        passed: true,
        evidence:
          hooks.format === 'executable'
            ? `${hooks.source} is a recognized executable hook.`
            : `${hooks.source} parses as a recognized JSON hooks configuration.`,
      };
    },
  },
  {
    id: 'HKS-02',
    dimension: 'hooks',
    title: 'Hooks use known events and required metadata',
    points: 2,
    remediation:
      'Use documented event names and include version metadata only where the vendor schema requires it.',
    run(ctx) {
      const candidates = hookSets(ctx);
      const hooks =
        candidates.find(
          (candidate) =>
            candidate.hasRequiredMetadata &&
            candidate.events.length > 0 &&
            candidate.unknownEvents.length === 0,
        ) ?? candidates[0];
      if (!hooks) return { passed: false, evidence: 'No parseable hooks configuration.' };
      const passed = hooks.hasRequiredMetadata && hooks.events.length > 0 && hooks.unknownEvents.length === 0;
      return {
        passed,
        evidence:
          hooks.events.length === 0
            ? `${hooks.source} has no registered events.`
            : hooks.unknownEvents.length > 0
              ? `Unknown event name(s): ${hooks.unknownEvents.join(', ')}`
              : !hooks.hasRequiredMetadata
                ? `${hooks.source} is missing required vendor metadata or version information.`
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
      'Register a vendor-supported pre-tool, command, file, prompt, or permission hook that can block risky operations.',
    run(ctx) {
      const hooks = hookSets(ctx).find((candidate) => candidate.gateEvents.length > 0);
      if (!hooks) return { passed: false, evidence: 'No parseable hooks configuration.' };
      return hooks.gateEvents.length > 0
        ? { passed: true, evidence: `Gate hook(s) registered on: ${hooks.gateEvents.join(', ')}.` }
        : { passed: false, evidence: `No gate hooks registered in ${hooks.source}.` };
    },
  },
  {
    id: 'HKS-04',
    dimension: 'hooks',
    title: 'Feedback hook observes agent output',
    points: 2,
    remediation:
      'Register a vendor-supported post-tool, post-edit, response, stop, or task-completion hook for fast feedback.',
    run(ctx) {
      const hooks = hookSets(ctx).find((candidate) => candidate.feedbackEvents.length > 0);
      if (!hooks) return { passed: false, evidence: 'No parseable hooks configuration.' };
      return hooks.feedbackEvents.length > 0
        ? { passed: true, evidence: `Feedback hook(s) registered on: ${hooks.feedbackEvents.join(', ')}.` }
        : { passed: false, evidence: `No feedback hooks registered in ${hooks.source}.` };
    },
  },
  {
    id: 'HKS-05',
    dimension: 'hooks',
    title: 'Hook scripts exist in the repository',
    points: 2,
    remediation: 'Commit every in-repository script referenced by a hook configuration.',
    run(ctx) {
      const candidates = hookSets(ctx).filter((candidate) => candidate.commands.length > 0);
      if (candidates.length === 0) return { passed: false, evidence: 'No hook commands declared.' };
      const allMissing: string[] = [];
      for (const hooks of candidates) {
        const { validated, missing } = hookCommandPathsResolve(hooks.commands, (path) => ctx.has(path));
        if (validated === 0) {
          return {
            passed: true,
            evidence: `${hooks.source}: hook commands do not reference in-repo paths (nothing to resolve).`,
          };
        }
        if (missing.length === 0) {
          return {
            passed: true,
            evidence: `${hooks.source}: all ${validated} path-referencing hook command(s) resolve.`,
          };
        }
        allMissing.push(...missing);
      }
      return {
        passed: false,
        evidence: `Hook command(s) reference missing files: ${allMissing.join(' | ')}`,
      };
    },
  },
];
