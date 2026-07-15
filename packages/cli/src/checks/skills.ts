import { collectCommands, collectSkills, summarizeArtifacts } from '../harness/index.js';
import type { Check, ScanContext } from '../types.js';
import { parseFrontmatter } from '../util.js';

function skillPaths(ctx: ScanContext): string[] {
  return collectSkills(ctx).map((s) => s.path);
}

export const skillChecks: Check[] = [
  {
    id: 'SKL-01',
    dimension: 'skills',
    title: 'At least one agent skill defined',
    points: 4,
    remediation:
      'Create a SKILL.md under your tool skills directory (.cursor/skills/, .claude/skills/, or .agents/skills/) packaging a procedural workflow the agent should follow on demand.',
    run(ctx) {
      const skills = collectSkills(ctx);
      return skills.length > 0
        ? { passed: true, evidence: summarizeArtifacts(skills, 'skill(s)') }
        : {
            passed: false,
            evidence: 'No SKILL.md under .cursor/skills/, .claude/skills/, or .agents/skills/.',
          };
    },
  },
  {
    id: 'SKL-02',
    dimension: 'skills',
    title: 'Skills declare name and description',
    points: 3,
    remediation:
      'Add frontmatter with name: and description: to every SKILL.md — the agent decides whether to load a skill from those two fields alone.',
    run(ctx) {
      const skills = skillPaths(ctx);
      if (skills.length === 0) {
        return { passed: false, evidence: 'No skills found to validate.' };
      }
      const invalid = skills.filter((s) => {
        const content = ctx.read(s);
        const fm = content ? parseFrontmatter(content) : null;
        return !(fm?.name && fm.description);
      });
      return invalid.length === 0
        ? { passed: true, evidence: `All ${skills.length} skill(s) declare name and description.` }
        : { passed: false, evidence: `Skills missing name/description frontmatter: ${invalid.join(', ')}` };
    },
  },
  {
    id: 'SKL-03',
    dimension: 'skills',
    title: 'Explicit workflows/commands defined',
    points: 3,
    remediation:
      'Add explicit workflow/command entry points (.cursor/commands/, .windsurf/workflows/, .claude/commands/, .continue/prompts/, …) for workflows you trigger intentionally.',
    run(ctx) {
      const commands = collectCommands(ctx);
      return commands.length > 0
        ? { passed: true, evidence: summarizeArtifacts(commands, 'command/workflow(s)') }
        : {
            passed: false,
            evidence:
              'No command/workflow files found (.cursor/commands, .windsurf/workflows, .claude/commands, .continue/prompts, …).',
          };
    },
  },
  {
    id: 'SKL-04',
    dimension: 'skills',
    title: 'Skill descriptions are trigger-worthy',
    points: 2,
    remediation:
      'Write skill descriptions of 40+ characters that say when to use the skill ("Use when…"), not just what it is — vague descriptions never trigger.',
    run(ctx) {
      const skills = skillPaths(ctx);
      if (skills.length === 0) {
        return { passed: false, evidence: 'No skills found.' };
      }
      const weak = skills.filter((s) => {
        const content = ctx.read(s);
        const fm = content ? parseFrontmatter(content) : null;
        return !(fm && (fm.description ?? '').length >= 40);
      });
      return weak.length === 0
        ? { passed: true, evidence: `All ${skills.length} skill description(s) are ≥40 characters.` }
        : { passed: false, evidence: `Skills with short/missing descriptions: ${weak.join(', ')}` };
    },
  },
];
