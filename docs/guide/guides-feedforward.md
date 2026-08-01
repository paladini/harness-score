# Guides — Feedforward Controls

Guides shape what the agent does *before* it acts. They are the cheapest
controls you have: a paragraph in the right place prevents entire categories
of mistakes. This chapter covers writing them well.

## The economics of context

Every guide competes for the same scarce resource: the model's context window
and attention. The failure mode of enthusiastic teams is not too few guides
but **too many words** — a 2,000-line rules file the model skims, a wiki
pasted into `AGENTS.md`. LangChain's harness lesson applies here: *assemble
context on the agent's behalf* means giving it the right 50 lines, not all
5,000.

Practical budget:

- `AGENTS.md`: ≤150 lines, always loaded — only what applies to *every* task.
- Always-on rules: one or two, ≤30 lines each.
- Glob-scoped rules: as many as you need; each loads only when relevant.
- Skills: unlimited length; loaded only on demand.

## Writing an AGENTS.md that works

Structure that has proven itself:

```markdown
# Agent Guide — <project>

## What this is
Two sentences. Domain, purpose, key constraint.

## Layout
- src/api — HTTP layer (see .cursor/rules/api.mdc)
- src/core — domain logic, pure functions only
- migrations/ — generated; never edit by hand

## Build & test
- npm run dev / npm test / npm run typecheck
- Tests MUST pass before any commit.

## Conventions
- TypeScript strict; no `any` without a comment.
- Never add dependencies without asking.

## Do not touch
- vendor/, generated/, legacy/payments (frozen for audit)
```

Principles:

1. **Commands over descriptions.** "Run `npm test`" beats "we value testing".
   Agents act on imperatives.
2. **Point, don't paste.** Link to the scoped rule or skill instead of
   inlining details ("see `.cursor/rules/api.mdc`").
3. **Say what not to do.** Negative space — frozen directories, forbidden
   patterns — prevents the most expensive mistakes.
4. **Keep it current.** A stale guide is worse than none; the agent follows it
   confidently. Reviewing `AGENTS.md` belongs in your definition of done for
   architectural changes.

## Writing rules that fire correctly

A rule has three jobs: apply at the right time, be short enough to be read,
and be concrete enough to be checkable.

**Scope aggressively.** The single biggest rules anti-pattern is
`alwaysApply: true` on everything. Every always-on rule is loaded for every
request — including the request to fix a typo in the README. Scope by glob:

```markdown
---
description: React component conventions
globs: src/components/**/*.tsx
---
```

**One concern per rule.** `api.mdc`, `testing.mdc`, `styling.mdc` — not
`everything.mdc`. Small rules are diffable, reviewable, and independently
scopeable.

**Concrete and checkable.** "Write good tests" guides nothing. "Every new
export in `src/core` needs a unit test in the sibling `__tests__` folder"
guides — and a reviewer (or a sensor) can verify it.

**Show, then tell.** A 5-line code example of the right pattern outperforms
three paragraphs describing it.

## Skills: the procedural layer

Anything that reads like a *runbook* belongs in a skill, not a rule:

- Deploy and release procedures
- Database migration workflows
- "How to add a new API endpoint end-to-end"
- Incident debugging playbooks

Skill quality hinges on the **description**, because that's all the agent
sees when deciding to load it. Compare:

```yaml
description: Deployment stuff            # never triggers
```

```yaml
description: Use when the user asks to deploy, release, or ship to
  production; covers tagging, the pipeline, rollback, and smoke tests.
```

Write descriptions as trigger conditions ("Use when…"), ≥40 characters,
naming the words a user would actually say.

## Commands: encode your team's verbs

Commands are guides for *humans and agents at once*: `/review`, `/release`,
`/new-endpoint` document how your team works in an executable form. A good
command prompt states the workflow, the quality bar, and the stopping
condition:

```markdown
# /review

Review the current diff against AGENTS.md and .cursor/rules/.
Report findings ordered by severity with file:line references.
Do not fix anything unless explicitly asked.
```

## Bootstrap scripts and templates

Böckeler lists bootstrap tooling among feedforward controls: generators and
templates that start the agent from a known-good skeleton (`npm run
new:endpoint`, a service template with observability wired in). When a
pattern must be repeated exactly, a generator beats a description of the
pattern — determinism again. Mention such scripts in `AGENTS.md` so agents
use them instead of hand-rolling.

## How guides fail, and what catches it

| Failure | Symptom | Countermeasure |
|---|---|---|
| Stale guide | Agent follows outdated convention | Review harness files in PRs touching architecture |
| Bloated context | Agent ignores mid-file instructions | Scope rules; move procedures to skills |
| Vague guidance | Agent interprets creatively | Make rules concrete and checkable |
| Guide ignored | Same mistake recurs | Escalate to a sensor or a hook (chapters 4–5) |

That last row is the bridge to the next chapter: guides are suggestions, and
some suggestions need to become **checks**.
