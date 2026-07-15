import { countRuleScopes, ruleHasValidFrontmatter } from '../harness/frontmatter.js';
import { collectRules, contextRootFile, summarizeArtifacts } from '../harness/index.js';
import type { Check } from '../types.js';
import { countHeadings, nonEmptyLines, totalLines } from '../util.js';

export const contextChecks: Check[] = [
  {
    id: 'CTX-01',
    dimension: 'context',
    title: 'Agent context file present (AGENTS.md)',
    points: 4,
    remediation:
      'Create an AGENTS.md at the repository root describing what the project is, how to build/test it, and the conventions agents must follow.',
    run(ctx) {
      const file = contextRootFile(ctx);
      return file
        ? { passed: true, evidence: `Found ${file} at repository root.` }
        : {
            passed: false,
            evidence: 'No AGENTS.md, CLAUDE.md, or GEMINI.md at repository root.',
          };
    },
  },
  {
    id: 'CTX-02',
    dimension: 'context',
    title: 'Agent context file is substantive',
    points: 3,
    remediation:
      'Flesh out AGENTS.md: add sections for project overview, build & test commands, architecture, and conventions (aim for 20+ meaningful lines with headings).',
    run(ctx) {
      const file = contextRootFile(ctx);
      const content = file ? ctx.read(file) : null;
      if (!file || content === null) {
        return { passed: false, evidence: 'No agent context file to evaluate.' };
      }
      const lines = nonEmptyLines(content);
      const headings = countHeadings(content);
      const passed = lines >= 20 && headings >= 2;
      return {
        passed,
        evidence: `${file}: ${lines} non-empty lines, ${headings} headings (needs ≥20 lines and ≥2 headings).`,
      };
    },
  },
  {
    id: 'CTX-03',
    dimension: 'context',
    title: 'Scoped rules in use',
    points: 4,
    remediation:
      'Add at least one scoped rule file for your AI tool (e.g. .cursor/rules/*.mdc, .windsurf/rules/*.md, .clinerules/*.md) stating the project non-negotiables.',
    run(ctx) {
      const rules = collectRules(ctx);
      return rules.length > 0
        ? { passed: true, evidence: summarizeArtifacts(rules, 'rule(s)') }
        : {
            passed: false,
            evidence:
              'No scoped rule files found (.cursor/rules, .windsurf/rules, .clinerules, .continue/rules, .github/instructions, .agents/rules, …).',
          };
    },
  },
  {
    id: 'CTX-04',
    dimension: 'context',
    title: 'Rules have valid frontmatter',
    points: 3,
    remediation:
      'Give every rule activation metadata in frontmatter (description, globs/trigger/paths/applyTo, or alwaysApply) so the agent knows when to load it.',
    run(ctx) {
      const rules = collectRules(ctx);
      if (rules.length === 0) {
        return { passed: false, evidence: 'No rules found to validate.' };
      }
      const invalid: string[] = [];
      for (const rule of rules) {
        const content = ctx.read(rule.path);
        if (!ruleHasValidFrontmatter(rule.path, rule.toolId, content)) invalid.push(rule.path);
      }
      return invalid.length === 0
        ? {
            passed: true,
            evidence: `All ${rules.length} rule(s) declare usable frontmatter.`,
          }
        : {
            passed: false,
            evidence: `Rules missing usable frontmatter: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? ', …' : ''}`,
          };
    },
  },
  {
    id: 'CTX-05',
    dimension: 'context',
    title: 'Rules are scoped, not all always-on',
    points: 2,
    remediation:
      'Scope rules to paths (globs, trigger glob, paths, applyTo) instead of making everything always-on — blanket rules consume context on every request.',
    run(ctx) {
      const rules = collectRules(ctx);
      if (rules.length === 0) {
        return { passed: false, evidence: 'No rules found.' };
      }
      const { scoped, alwaysOn } = countRuleScopes(rules, (p) => ctx.read(p));
      const passed = rules.length === 1 || scoped > 0 || alwaysOn < rules.length;
      return {
        passed,
        evidence: `${rules.length} rule(s): ${scoped} path-scoped, ${alwaysOn} always-on.`,
      };
    },
  },
  {
    id: 'CTX-06',
    dimension: 'context',
    title: 'No bloated rules (≤500 lines each)',
    points: 2,
    remediation:
      'Split rules longer than 500 lines into focused, scoped rules or move procedural content into a skill — huge rules crowd out task context.',
    run(ctx) {
      const rules = collectRules(ctx);
      if (rules.length === 0) {
        return { passed: false, evidence: 'No rules found.' };
      }
      const bloated = rules.filter((r) => {
        const content = ctx.read(r.path);
        return content !== null && totalLines(content) > 500;
      });
      return bloated.length === 0
        ? { passed: true, evidence: `All ${rules.length} rule(s) are ≤500 lines.` }
        : {
            passed: false,
            evidence: `Oversized rules: ${bloated.map((r) => r.path).join(', ')}`,
          };
    },
  },
  {
    id: 'CTX-07',
    dimension: 'context',
    title: 'README present',
    points: 1,
    remediation: 'Add a README.md — agents (and humans) use it as the first orientation document.',
    run(ctx) {
      return ctx.has('README.md')
        ? { passed: true, evidence: 'README.md found at repository root.' }
        : { passed: false, evidence: 'No README.md at repository root.' };
    },
  },
  {
    id: 'CTX-08',
    dimension: 'context',
    title: 'No legacy .cursorrules file',
    points: 1,
    remediation:
      'Migrate the legacy .cursorrules file to scoped rules with frontmatter (.cursor/rules/*.mdc or your tool equivalent) — .cursorrules is deprecated.',
    run(ctx) {
      if (!ctx.has('.cursorrules')) {
        return { passed: true, evidence: 'No deprecated .cursorrules file.' };
      }
      if (collectRules(ctx).length > 0) {
        return {
          passed: true,
          evidence: 'Legacy .cursorrules present but modern scoped rules also exist.',
        };
      }
      return { passed: false, evidence: 'Legacy .cursorrules file found with no modern scoped rules.' };
    },
  },
];
