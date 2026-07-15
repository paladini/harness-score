import { collectSubagents, summarizeArtifacts } from '../harness/index.js';
import type { Check, ScanContext } from '../types.js';
import { parseFrontmatter } from '../util.js';

function agentPaths(ctx: ScanContext): string[] {
  return collectSubagents(ctx).map((a) => a.path);
}

export const agentChecks: Check[] = [
  {
    id: 'AGT-01',
    dimension: 'skills',
    title: 'Custom subagent defined',
    points: 3,
    remediation:
      'Create a subagent definition (.cursor/agents/, .claude/agents/, or .opencode/agents/) for a purpose-built delegate (planning, review, release…).',
    run(ctx) {
      const agents = collectSubagents(ctx);
      return agents.length > 0
        ? { passed: true, evidence: summarizeArtifacts(agents, 'subagent(s)') }
        : {
            passed: false,
            evidence: 'No subagent files found (.cursor/agents, .claude/agents, or .opencode/agents).',
          };
    },
  },
  {
    id: 'AGT-02',
    dimension: 'skills',
    title: 'Subagents declare name and description',
    points: 2,
    remediation:
      'Add frontmatter with name: and description: to every subagent definition — the parent agent decides whether to delegate from those two fields alone.',
    run(ctx) {
      const agents = agentPaths(ctx);
      if (agents.length === 0) {
        return { passed: false, evidence: 'No subagents found to validate.' };
      }
      const invalid = agents.filter((a) => {
        const content = ctx.read(a);
        const fm = content ? parseFrontmatter(content) : null;
        return !(fm?.name && fm.description);
      });
      return invalid.length === 0
        ? { passed: true, evidence: `All ${agents.length} subagent(s) declare name and description.` }
        : {
            passed: false,
            evidence: `Subagents missing name/description frontmatter: ${invalid.join(', ')}`,
          };
    },
  },
];
