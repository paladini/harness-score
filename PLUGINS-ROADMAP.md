# Multi-harness plugin plan

This document plans extending harness-score's single Cursor plugin
(`plugin/`) into a family of thin, per-tool plugins — Claude Code, Windsurf,
OpenAI Codex CLI, VS Code, OpenCode, Cline, Continue.dev, Zed, JetBrains
AI Assistant (Junie), and others — that all wrap the same deterministic
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

## Landscape research (2026-07-14)

Two facts change the calculus for this whole plan, both confirmed via live
web search rather than assumed from training data (this space moves fast
enough that stale assumptions are a real risk):

1. **`AGENTS.md` is now a Linux Foundation-governed open standard.**
   Formalized in August 2025 by OpenAI, Google, Cursor, Factory, and
   Sourcegraph, then donated to the Agentic AI Foundation (Linux Foundation)
   in December 2025. As of that point, 60,000+ repositories and 20+ tools
   already read it natively — including 8 of the 10 tools researched below.
   This repo's own guide already teaches "write a substantive `AGENTS.md`"
   as the single highest-leverage step (`CTX-01`/`CTX-02`), so the baseline
   layer of cross-tool compatibility is close to free. The real
   differentiation work is in the richer artifacts (scoped rules, skills,
   subagents, hooks) that go beyond plain `AGENTS.md` — exactly what the
   deeper rubric dimensions (Skills & Commands, Hooks & Guardrails) already
   measure.
2. **MCP (Model Context Protocol) is now near-universal.** Donated to the
   Linux Foundation in December 2025; supported natively by Cursor, Claude
   Code, Windsurf, VS Code Copilot, Continue.dev, and Zed (via Context
   Servers). This strengthens the case for the `harness-score-mcp` idea
   already noted below — one server consumable identically by most of the
   researched tools, rather than N copies of "how to invoke the CLI."

### Top-10 AI-first dev tools with their own artifact conventions

Ranked by a mix of market presence and distinctiveness of their own
artifact format (tools that are mostly cloud-console-configured, like
Amazon Q Developer or Tabnine, have less of a repo-file surface to target
and are omitted from the "own artifact" framing, though they're large by
adoption):

| # | Tool | Artifact convention |
|---|---|---|
| 1 | **GitHub Copilot** (VS Code) — ~37% market share, 4.7M paid seats | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` (glob-scoped via `applyTo`, `excludeAgent` for per-agent targeting) — now also reads `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` natively |
| 2 | **Cursor** | `.cursor/rules/*.mdc`, `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/mcp.json` — already fully supported by this repo |
| 3 | **Claude Code** | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `CLAUDE.md`, hooks, `.claude-plugin/marketplace.json` |
| 4 | **Windsurf** | `.windsurf/rules/*.md` (`trigger` frontmatter), `.windsurf/workflows/*.md` |
| 5 | **OpenAI Codex CLI** | Reads `AGENTS.md`; skills in `.agents/skills/*/SKILL.md` or `~/.codex/skills/` |
| 6 | **OpenCode** (`sst/opencode`) — 160K+ GitHub stars, ~7.5M monthly devs | Reads `AGENTS.md` (first-match wins over `CLAUDE.md`); `opencode.json`'s `"instructions"` array can point at arbitrary existing files, including `.cursor/rules/*.md` directly; markdown subagents in `.opencode/agents/*.md` (filename = agent name) |
| 7 | **JetBrains AI Assistant / Junie** | `.junie/AGENTS.md` (project) or `~/.junie/AGENTS.md` (global) — built directly on the `AGENTS.md` standard |
| 8 | **Cline** (VS Code extension) | `.clinerules` (single file) or `.clinerules/*.md` with YAML frontmatter `paths: [...]` for glob-scoping — structurally close to Cursor's scoped rules; also a "Memory Bank" (persistent markdown state files) |
| 9 | **Continue.dev** | `config.yaml` (models/context/MCP) + `.continue/rules/*.md` (auto-loaded) + `.continue/prompts/*` (custom `/commands`) |
| 10 | **Zed** | `.rules` at project root — also reads `.cursorrules` and `CLAUDE.md` as fallbacks; a Rules Library; `.zed/commands/*.md` custom commands (in discussion, not fully shipped as of this research) |

Honorable mention: **Amp** (Sourcegraph) originated the singular `AGENT.md`
proposal before the ecosystem converged on the plural `AGENTS.md` form; Amp
itself now reads `AGENTS.md`, has subagents, and supports MCP, but has no
distinct rules-file convention of its own.

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
- **Effort:** lowest among the full plugin-style integrations — same
  command text as Cursor's `harness-audit.md`, same skill content as
  `harness-engineering/SKILL.md`, different frontmatter/dir names.

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

### OpenCode — 160K+ GitHub stars, ~7.5M monthly devs, terminal-native

- **Format:** reads `AGENTS.md` directly (first-match wins over `CLAUDE.md`
  if both exist), so the same content used for Codex/Claude Code applies
  with zero translation. Subagents are markdown files in
  `.opencode/agents/*.md` (project) or `~/.config/opencode/agents/` (global)
  — filename becomes the agent name, same shape as Claude Code/Cursor
  subagents. `opencode.json`'s `"instructions"` array can additionally point
  at arbitrary existing files (including glob patterns like
  `.cursor/rules/*.md`), which means an OpenCode user could reuse this
  repo's Cursor rules directly without any porting at all.
- **Distribution:** no marketplace; ships as files a user copies in, same
  as Windsurf/Codex.
- **Effort:** low. `AGENTS.md` reuse is free; a `harness-audit` subagent
  is a small new markdown file in `.opencode/agents/`.

### Cline (VS Code extension)

- **Format:** `.clinerules` (single file) or `.clinerules/*.md` (directory,
  merged into one context block) with optional YAML frontmatter —
  `paths: ["src/**", ...]` glob-scopes a rule, structurally close to
  Cursor's `.mdc` scoped rules. Also has a "Memory Bank" convention
  (persistent markdown files the agent is told to update) — a different
  concept from this repo's rubric (session memory, not static guidance) and
  likely out of scope for a first pass.
- **Distribution:** no marketplace of its own for rule content (Cline
  itself installs from the VS Code Marketplace); rule files ship as docs +
  copyable content, same as Windsurf/Codex/OpenCode.
- **Effort:** low. The recipe content maps onto `.clinerules/harness-engineering.md`
  with a `paths:` scope if needed; no command/skill mechanism to wrap the
  scanner invocation in, same limitation as Codex.

### Continue.dev

- **Format:** `config.yaml` (models, context providers, MCP servers) plus
  `.continue/rules/*.md` (auto-loaded on startup, appended to every
  chat/agent/edit system prompt) and `.continue/prompts/*` (custom
  `/command`-style templates — the closest analog to Cursor's
  `commands/harness-audit.md`).
- **Distribution:** no marketplace; config lives in the user's repo/machine.
- **Effort:** low. Maps cleanly onto `.continue/rules/harness-engineering.md`
  + a `.continue/prompts/harness-audit.md` command.

### Zed

- **Format:** `.rules` at the project root (Zed also reads `.cursorrules`
  and `CLAUDE.md` as fallbacks — meaning Zed users may already pick up this
  repo's guidance indirectly with zero work). A user-level Rules Library
  for reusable snippets. Custom commands (`.zed/commands/*.md` →
  `/command-name`) were still in discussion, not fully shipped, as of this
  research — verify before implementing.
- **Distribution:** no marketplace; plain files.
- **Effort:** low, but re-check the custom-commands feature's shipped state
  before committing to a `harness-audit` command file for it — it may only
  be achievable via a `.rules` mention today.

### JetBrains AI Assistant / Junie

- **Format:** `.junie/AGENTS.md` (project-level, preferred) or
  `~/.junie/AGENTS.md` (global) — Junie is built directly on the
  `AGENTS.md` standard, so this is effectively free: the same file this
  repo's guide already recommends, just also discoverable from a
  `.junie/` subdirectory. No separate skill/command/subagent mechanism
  documented at the time of this research.
- **Distribution:** JetBrains Marketplace covers the *IDE plugin* (Junie
  itself), not per-project recipe content — same "docs + copyable files"
  shape as the other markdown-only targets.
- **Effort:** lowest of all — likely just a doc note ("`.junie/AGENTS.md`
  also works") rather than a new artifact.

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

- **Amp** (Sourcegraph) — reads `AGENTS.md` (it originated the singular
  `AGENT.md` proposal before the ecosystem converged on the plural form),
  has subagents and MCP support, but no distinct rules-file convention of
  its own — `AGENTS.md` reuse alone likely covers it.
- **Aider** — has its own conventions file; not researched in depth here,
  add to this table before picking it up.
- **Amazon Q Developer, Tabnine** — large by adoption but more
  console/IDE-config-driven than repo-file-driven; lower priority for a
  "recognize local repo artifacts" scanner since there's less of a
  distinctive file to target or generate.
- An **MCP server** (`harness-score-mcp` or similar) exposing `scan_repo` /
  `get_report` as MCP tools would be consumable by Cursor, Claude Code,
  Windsurf, VS Code Copilot, Continue.dev, and Zed simultaneously (MCP is
  now near-universal across this list — see
  [Landscape research](#landscape-research-2026-07-14)). This is a real
  alternative to "npx wrapper in every skill file" — one MCP server instead
  of N copies of "how to invoke the CLI." Worth a dedicated design pass once
  2-3 markdown-based plugins exist and the duplication is felt directly,
  not before.

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
  opencode/
    agents/harness-audit.md
  cline/
    harness-engineering.md         # copied into a user's .clinerules/
  continue/
    rules/harness-engineering.md
    prompts/harness-audit.md
  zed/
    rules.md                       # copied into a user's .rules
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
- **Windsurf / Codex / OpenCode / Cline / Continue.dev / Zed:** no publish
  job — these all ship as documentation (a guide page with copy-paste
  content, or files a user pulls via `npx harness-score init`, once that
  command exists). Add a `plugins-sync` CI check (see above) so stale
  copies can't merge.
- **JetBrains AI Assistant / Junie:** no artifact to publish at all — this
  is a doc-only note ("`.junie/AGENTS.md` also works"), not a new package.
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
2. **OpenCode, Codex, JetBrains/Junie** — all read `AGENTS.md` natively, so
   these are close to zero marginal content cost once Claude Code's
   `shared/` recipe exists; OpenCode additionally gets a small subagent
   file, Junie needs only a doc note.
3. **Windsurf, Cline, Continue.dev, Zed** — markdown-only rules/workflow
   files, no build step, low risk once the sync mechanism exists. Re-verify
   Zed's custom-commands feature has shipped before writing a command file
   for it (unconfirmed as of this research); a `.rules` mention is the safe
   fallback.
4. **VS Code** — last, because it's a real software project (extension
   host code, its own tests, marketplace account, CI publishing secrets),
   not a content-reuse exercise. Don't start this until 1–3 have proven the
   shared-content pipeline is solid, since VS Code is the one place bugs in
   the *wrapper* (not the CLI) are most likely to surface.

## Open decisions before any implementation

These need a maintainer call, not a default assumption:

1. **Branding/scope.** The guide and repo are currently framed as "for
   Cursor" (README pitch, docs site copy, `AGENTS.md`'s own description).
   Shipping nine more harness targets from the same repo (the landscape
   research above found real per-tool artifact conventions for all of them,
   not just the original four) likely means reframing the pitch as
   harness-agnostic ("AI coding harness maturity", Cursor as the
   first-class example) rather than Cursor-specific with bolted-on ports.
   This affects README, docs site copy, and possibly the repo's public
   description/topics — worth deciding before Phase 0, since it changes
   wording in every plugin's README too.
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
