import { collectSubagents, type HarnessArtifact, summarizeArtifacts } from '../harness/index.js';
import type { Check, ScanContext } from '../types.js';
import { parseFrontmatter, safeJsonParse } from '../util.js';

function agentPaths(ctx: ScanContext): string[] {
  return collectSubagents(ctx).map((a) => a.path);
}

function agentDeclaresIdentity(agent: HarnessArtifact, content: string | null): boolean {
  if (!content) return false;
  if (agent.path === '.roomodes' || agent.path.endsWith('/.roomodes')) {
    return (
      /(^|\n)\s*-?\s*slug\s*:\s*\S+/i.test(content) &&
      /(^|\n)\s*name\s*:\s*\S+/i.test(content) &&
      /(^|\n)\s*(?:description|roleDefinition)\s*:\s*\S+/i.test(content)
    );
  }
  if (agent.path.endsWith('.json')) {
    const parsed = safeJsonParse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const config = parsed as Record<string, unknown>;
    return typeof config.description === 'string';
  }
  const fm = parseFrontmatter(content);
  if (!fm?.description) return false;
  // These vendors document the filename/path as the fallback agent name.
  return ['opencode', 'copilot', 'kiro', 'junie'].includes(agent.toolId) || Boolean(fm.name);
}

export const agentChecks: Check[] = [
  {
    id: 'AGT-01',
    dimension: 'skills',
    title: 'Custom subagent defined',
    points: 3,
    remediation:
      'Create a recognized subagent definition for a purpose-built delegate (planning, review, release).',
    run(ctx) {
      const agents = collectSubagents(ctx);
      return agents.length > 0
        ? { passed: true, evidence: summarizeArtifacts(agents, 'subagent(s)') }
        : { passed: false, evidence: 'No recognized subagent definitions found.' };
    },
  },
  {
    id: 'AGT-02',
    dimension: 'skills',
    title: 'Subagents declare a discoverable identity and description',
    points: 2,
    remediation:
      'Give every subagent the identity and description metadata required by its vendor so the parent can delegate correctly.',
    run(ctx) {
      const artifacts = collectSubagents(ctx);
      const agents = agentPaths(ctx);
      if (agents.length === 0) {
        return { passed: false, evidence: 'No subagents found to validate.' };
      }
      const invalid = artifacts.filter((agent) => !agentDeclaresIdentity(agent, ctx.read(agent.path)));
      return invalid.length === 0
        ? { passed: true, evidence: `All ${agents.length} subagent(s) declare usable identity metadata.` }
        : {
            passed: false,
            evidence: `Subagents missing required identity metadata: ${invalid.map((a) => a.path).join(', ')}`,
          };
    },
  },
];
