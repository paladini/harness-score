# Multi-harness plugin plan

This document plans extending harness-score's single Cursor plugin
(`plugin/`) into a family of thin, per-tool plugins — Claude Code, Windsurf,
OpenAI Codex CLI, VS Code, and others — that all wrap the same deterministic
scanner, published from one repository. It answers the question raised (but
deliberately not designed) in [ROADMAP.md](ROADMAP.md#also-under-consideration-not-yet-scheduled):
*"expanding beyond Cursor-specific artifacts... needs its own branding/scope
decision before design."*

This is a **planning document only** — nothing here has been implemented.
See [Open decisions](#open-decisions-before-any-implementation) for what
needs a call from the maintainer before Phase 0 starts.

## Why this is easy to reuse

The thing every plugin actually wraps is `npx harness-score` — a zero-dep,
deterministic, offline CLI. None of the per-tool work below touches
`packages/cli/`. Every plugin is a **thin adapter**: a tool-specific way to
invoke the same npm package and present the same report, plus a tool-specific
way to teach the agent the harness-engineering recipes. That means:

- The rubric, checks, fixtures, and test suite are already shared — zero
  duplication risk there.
- The only genuinely new content per tool is (a) an invocation wrapper
  (command/workflow file) and (b) the remediation guidance (skill/rule
  content). (b) is ~90% identical prose across tools; only frontmatter and
  invocation syntax differ.
- The release pipeline already publishes the CLI to three registries from
  one workflow — extending it to also package plugin artifacts is additive,
  not a rewrite.

## Target harnesses and what each actually requires

Researched as of 2026-07; verify against each tool's docs before
implementing, since these surfaces move fast.

### Claude Code — closest analog to the existing Cursor plugin

- **Format:** a plugin directory with `.claude-plugin/plugin.json` plus
  `commands/*.md` (slash commands), `skills/*/SKILL.md`, optionally
  `agents/*.md` and `hooks/`. Structurally almost identical to what
  `plugin/` already is for Cursor.
- **Distribution:** no registry to publish to. Any public GitHub repo with a
  root `.claude-plugin/marketplace.json` *is* a marketplace. Users run
  `/plugin marketplace add paladini/harness-score` then install from the
  `/plugin` menu. This repo can be its own marketplace — no new hosting.
- **Effort:** lowest of the four. Same command text as Cursor's
  `harness-audit.md`, same skill content as `harness-engineering/SKILL.md`,
  different frontmatter/dir names.

### Windsurf — no plugin system, but has an equivalent

- **Format:** `.windsurf/workflows/*.md` (invoked as `/workflow-name`,
  manual-only, 12,000-char limit per file) and `.windsurf/rules/*.md`
  (`trigger` frontmatter: Always On / Manual / Model Decision / Glob;
  6,000-char global / 12,000-char per-file limit).
- **Distribution:** there is no marketplace or install command — these are
  plain files a user copies into their own repo's `.windsurf/` directory.
  Distribution means: a docs page with the file contents to copy, or a
  copier script (`npx harness-score --emit windsurf > .windsurf/workflows/harness-audit.md`,
  see [Also under consideration](ROADMAP.md#also-under-consideration-not-yet-scheduled)'s
  `harness-score init` idea — this is a natural place for that command to
  grow into).
- **Effort:** low. Markdown only, but respect the character limits (the
  Cursor skill content should be checked against the 12k ceiling before
  reuse).

### OpenAI Codex CLI

- **Format:** reads `AGENTS.md` (already something this repo's own guide
  teaches, so the remediation content translates almost directly). Skills
  live in `.agents/skills/*/SKILL.md` (project) or `~/.codex/skills/`
  (global) — same `SKILL.md` shape Claude Code and Cursor already use. No
  native slash-command file format for arbitrary scripts; the closest analog
  to "run the audit" is an MCP tool call or a documented `npx harness-score`
  invocation in the skill instructions.
- **Distribution:** no marketplace. Same as Windsurf — docs + copyable
  files, or an MCP server (see below).
- **Effort:** low-medium. The `SKILL.md` format reuse is nearly free; the
  "run the scanner" step needs to be a documented shell step rather than a
  slash command, since Codex has no custom-command mechanism.

### VS Code

- **Format:** a real extension — `package.json` with `engines.vscode`,
  `contributes.commands`, and optionally a Chat Participant
  (`@harness-score` inside Copilot Chat) implemented in TypeScript against
  the extension host API.
- **Distribution:** VS Code Marketplace via `vsce publish`, requiring a
  publisher account. **Azure DevOps PATs are being retired December 2026** —
  publishing auth must be set up via Microsoft Entra ID / federated
  credentials from the start, not a PAT that will need migrating later.
  Consider also publishing to Open VSX (covers VS Code forks that don't use
  Microsoft's marketplace).
- **Effort:** highest by far. This is the only target that's a real
  standalone codebase (UI, extension host, its own test harness) rather than
  a handful of markdown files — it needs ongoing maintenance like any
  software project, not just content updates.

### Others (not scoped now, just noted for shape)

- **Zed, Continue, Amp, Aider** — each has its own rules/config file
  convention; same "thin adapter" shape would apply. Not researched in
  depth here; add to this table before picking one up.
- An **MCP server** (`harness-score-mcp` or similar) exposing `scan_repo` /
  `get_report` as MCP tools would be consumable by Claude Code, Codex, and
  Windsurf simultaneously (all support MCP), and by VS Code's Copilot Chat.
  This is a real alternative to "npx wrapper in every skill file" — one MCP
  server instead of four copies of "how to invoke the CLI." Worth a
  dedicated design pass once 2-3 markdown-based plugins exist and the
  duplication is felt directly, not before.

## Proposed repo layout

Rename `plugin/` (singular, Cursor-only) to `plugins/<tool>/` (plural), one
directory per tool, plus a `shared/` directory holding the one copy of
content that's identical across tools:

```
plugins/
  cursor/                       # current plugin/, moved as-is
    .cursor-plugin/plugin.json
    commands/harness-audit.md
    skills/harness-engineering/SKILL.md
  claude-code/
    .claude-plugin/plugin.json
    commands/harness-audit.md
    skills/harness-engineering/SKILL.md
  windsurf/
    workflows/harness-audit.md
    rules/harness-engineering.md
  codex/
    skills/harness-engineering/SKILL.md
  vscode/                       # real extension project, not just markdown
    package.json
    src/extension.ts
    ...
  shared/
    harness-engineering-recipe.md   # single source of truth prose
    generate.mjs                    # stamps shared prose into each tool's file
.claude-plugin/
  marketplace.json               # repo root, lists plugins/claude-code (and
                                  # future entries) as a Claude Code marketplace
```

`.claude-plugin/marketplace.json` has to live at the repo root (that's where
Claude Code looks for it), not inside `plugins/claude-code/` — same
constraint the existing `.cursor-plugin/plugin.json` already has relative to
`plugin/`.

## Avoiding drift: a sync test, like `docs-sync` already does

This repo already enforces rubric consistency across `score.ts` /
`maturity-model.md` / `measure-and-improve.md` with a `docs-sync` vitest
suite (see `AGENTS.md`). Apply the same idea here: `shared/generate.mjs`
regenerates each `plugins/<tool>/.../SKILL.md` (or workflow/rule file) from
`shared/harness-engineering-recipe.md`, and a `plugins-sync` test asserts the
checked-in files match what generation produces — so nobody hand-edits one
tool's copy and silently forgets the other three. Cursor's file becomes
generated output too, not the hand-maintained original.

## Release pipeline changes

Extend [`release.yml`](.github/workflows/release.yml) and
[`RELEASING.md`](RELEASING.md) — additive jobs, no change to the existing
npm/GitHub Packages/JSR jobs:

- **Cursor:** unchanged (manual resubmit at cursor.com/marketplace/publish
  only if plugin metadata changed — already documented).
- **Claude Code:** no publish job needed — the marketplace *is* this git
  repo. A version bump in `plugins/claude-code/.claude-plugin/plugin.json`
  and a push to `main` is the entire "release."
- **Windsurf / Codex:** no publish job — these ship as documentation (a
  guide page with copy-paste content, or files a user pulls via `npx
  harness-score init`, once that command exists). Add a `plugins-sync` CI
  check (see above) so stale copies can't merge.
- **VS Code:** new job in `release.yml` running `vsce publish` (and
  `ovsx publish` for Open VSX), gated on an Entra ID / federated credential
  — set this up before the first VS Code release, not after PATs are
  retired in December 2026.

## Suggested sequencing

1. **Claude Code** — smallest diff from what already exists, reuses the
   exact same content shape as the Cursor plugin, dogfoodable immediately
   (this very repo already uses Claude Code as a harness). Also validates
   the `shared/` + sync-test mechanism cheaply before more tools depend on
   it.
2. **Windsurf** — markdown only, no build step, low risk once the sync
   mechanism exists.
3. **Codex** — same shape as Windsurf; slightly more docs work since there's
   no slash-command equivalent.
4. **VS Code** — last, because it's a real software project (extension
   host code, its own tests, marketplace account, CI publishing secrets),
   not a content-reuse exercise. Don't start this until 1–3 have proven the
   shared-content pipeline is solid, since VS Code is the one place bugs in
   the *wrapper* (not the CLI) are most likely to surface.

## Open decisions before any implementation

These need a maintainer call, not a default assumption:

1. **Branding/scope.** The guide and repo are currently framed as "for
   Cursor" (README pitch, docs site copy, `AGENTS.md`'s own description).
   Shipping four more harness targets from the same repo likely means
   reframing the pitch as harness-agnostic ("AI coding harness maturity",
   Cursor as the first-class example) rather than Cursor-specific with
   bolted-on ports. This affects README, docs site copy, and possibly the
   repo's public description/topics — worth deciding before Phase 0, since
   it changes wording in every plugin's README too.
2. **Whether to build the MCP server now or later.** It removes duplication
   across Codex/Windsurf/Claude Code invocation instructions, but is a new
   package with its own release surface. Recommend deferring until after
   Claude Code + Windsurf ship and the duplication is concretely visible.
3. **VS Code Marketplace publisher identity.** Needs an account and (per the
   Dec 2026 PAT retirement) an Entra ID app registration — an
   organization-level decision, not something to default.

## Non-goals

- No change to `packages/cli/`, the rubric, or fixtures — this plan is
  entirely about presentation-layer wrappers.
- No new check dimensions (unrelated to the deferred `AGT-*`/`HYG-08`-style
  rubric work already tracked in `ROADMAP.md`).
