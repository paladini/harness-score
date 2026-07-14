# The Cursor Harness Surface

Cursor exposes more harness machinery than any other mainstream AI editor.
This chapter is the map: every artifact, where it lives, and what job it does
in the control system.

## The artifacts at a glance

| Artifact | Path | Family | Loaded |
|---|---|---|---|
| Agent context file | `AGENTS.md` | Guide | Always |
| Rules | `.cursor/rules/*.mdc` | Guide | Always / by glob / by relevance |
| Skills | `.cursor/skills/*/SKILL.md` | Guide | On demand, by description |
| Commands | `.cursor/commands/*.md` | Guide | Explicitly, via `/name` |
| Hooks | `.cursor/hooks.json` | Sensor + Guardrail | On agent-loop events |
| MCP servers | `.cursor/mcp.json` | Guide (tools) | Per session |
| Subagents | agent definitions | Guide | Delegated tasks |
| Plugins | Marketplace / `.cursor-plugin/` | All bundled | Installed |

Everything lives in the repository, which is the point: **the harness ships
with the code**, is versioned with the code, and is reviewed like code.

## AGENTS.md — the front door

`AGENTS.md` at the repository root is the first thing an agent reads. It is an
open convention (Cursor, Claude Code, and most agentic tools honor it) and the
highest-leverage single file in your harness. It should answer, briefly:

- What is this project and how is it laid out?
- How do I build, run, and **test** it?
- What conventions are non-negotiable?
- What must I never touch?

Keep it under ~150 lines. It is loaded on every session — every line taxes the
context window of every task. Details that only matter sometimes belong in
scoped rules or skills.

## Rules — persistent, declarative guidance

Rules are markdown-with-frontmatter files (`.mdc`) under `.cursor/rules/`.
Each rule declares *when it applies*:

```markdown
---
description: API route conventions
globs: src/api/**
---

- Every route validates input with zod before use.
- Errors return `{ "error": string }` and a correct status code.
```

Three activation modes:

- `alwaysApply: true` — injected into every request. Reserve for true
  non-negotiables; every always-on rule is a permanent context tax.
- `globs: <pattern>` — applied when matching files are in play. This is the
  workhorse mode: conventions live next to the code they govern.
- `description` only — the agent decides relevance from the description.

Nested `.cursor/rules/` directories work in monorepos: put package-specific
rules inside the package.

The legacy single-file `.cursorrules` is deprecated. Migrate it: split by
concern, scope by glob.

## Skills — procedural knowledge on demand

A skill is a folder with a `SKILL.md` (open Agent Skills standard):

```markdown
---
name: deploy
description: Use when the user asks to deploy or release; covers tagging,
  pipeline, and smoke tests.
---

# Deploying
1. …step-by-step workflow…
```

Cursor shows the agent every skill's `name` + `description` at session start;
the body loads **only when the agent judges it relevant**. That makes skills
the right home for long procedural content that would bloat rules: deploy
runbooks, migration recipes, release checklists, debugging playbooks.

The rule of thumb: **rules are declarative and always-on-ish ("use strict
TypeScript"), skills are procedural and on-demand ("here is how we deploy")**.
The description is the trigger — write it as "Use when…" or it will never
fire.

## Commands — workflows you invoke deliberately

Markdown files under `.cursor/commands/` become `/slash-commands`. Unlike
skills (agent-triggered), commands are **human-triggered**: repeatable
workflows you want on a keybinding-like surface — `/review`, `/release`,
`/harness-audit`. A command file is simply the prompt that runs when invoked.

## Hooks — observe and control the agent loop

`.cursor/hooks.json` registers scripts on agent lifecycle events:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard.js" }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format.js" }]
  }
}
```

Scripts receive JSON on stdin and answer on stdout — including permission
decisions (`allow` / `deny` / `ask`) for the gating events. Key events:

- **Gates** (can block): `beforeShellExecution`, `beforeMCPExecution`,
  `preToolUse`, `beforeReadFile`
- **Feedback** (observe results): `afterFileEdit`, `postToolUse`,
  `afterShellExecution`, `stop`
- **Lifecycle**: `sessionStart` (inject context), `sessionEnd`, `preCompact`

Hooks are the only Cursor mechanism that is *enforced by the harness runtime*
rather than *suggested to the model*. A rule saying "never run destructive
commands" is a request; a `beforeShellExecution` hook that denies them is a
fact. Chapter 5 builds on this distinction.

## MCP — tools and knowledge

`.cursor/mcp.json` connects Model Context Protocol servers: databases, issue
trackers, docs, browsers. From a harness perspective MCP is a guide (it
determines what the agent can *see and do*) and a risk surface (servers run
with your credentials — never inline secrets; use `${ENV_VAR}` interpolation).

## Subagents — purpose-built delegates {#subagents-purpose-built-delegates}

A subagent is a markdown file under `.cursor/agents/` (or a plugin's
`agents/` folder) with the same `name` + `description` frontmatter contract
as a skill:

```markdown
---
name: reviewer
description: Use when asked to review a pull request or diff for conventions
  in AGENTS.md and .cursor/rules; reports findings by severity without
  editing code.
---

# Reviewer subagent

Read the diff, AGENTS.md, and .cursor/rules/*.mdc. Report violations ordered
by severity. Never modify code — that's the parent agent's job.
```

The distinction from a skill: a skill teaches the *primary* agent a
procedure it runs inline; a subagent is a **separate delegate** the primary
agent hands a task to — often with its own scoped tool access or a narrower
job description, so a large task (a full repo audit, a multi-step release)
can be split across specialized workers instead of one agent doing
everything in one context. Cursor's own docs describe this as delegating
"purpose-built" work — a planner, a reviewer, a release runner — each with a
tight enough description that the primary agent can decide when to hand off
without guessing.

The same rule as skills applies to the description: it is the only signal
the parent agent uses to decide whether to delegate, so write it as a
trigger condition, not a label.

## Plugins — the harness, packaged

A Cursor plugin bundles rules, skills, commands, hooks, agents, and MCP
config under one installable unit with a `.cursor-plugin/plugin.json`
manifest, distributed through the
[Cursor Marketplace](https://cursor.com/marketplace). Plugins matter for
harness engineering because they make harness patterns **reusable across
repositories** — including the
[Harness Score plugin](/guide/measure-and-improve#the-cursor-plugin) that
audits the very artifacts this chapter described (installable from its
repo directory today; its Marketplace listing is pending review).

## Choosing the right mechanism

| You want to… | Use |
|---|---|
| State a convention that always holds | Rule (`alwaysApply`) — sparingly |
| State a convention for part of the codebase | Rule with `globs` |
| Teach a multi-step procedure | Skill |
| Package a workflow humans trigger | Command |
| Delegate a job to a separate, purpose-built worker | Subagent |
| Enforce something regardless of what the model thinks | Hook |
| Give the agent a tool or data source | MCP server |
| Share all of the above across repos | Plugin |

If a piece of guidance keeps being ignored, move it *down* this table — from
prose the model may skip, toward mechanisms the runtime enforces.
