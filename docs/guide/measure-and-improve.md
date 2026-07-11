# Measure & Improve

Everything in this guide condenses into one command:

```bash
npx harness-score
```

The scanner walks your repository (filesystem only — no LLM, no network, no
telemetry), runs 33 deterministic checks, and reports a maturity level with
the exact gaps to the next one:

```
  harness-score v0.1.2  /work/my-app

  Maturity: L2 · Guided   Score: 61/100 (61%)

  Context & Guides     ████████████████░░░░  80%
  Skills & Commands    █████████████░░░░░░░  67%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  ...

  To reach L3: sensors ≥ 60%; ci ≥ 50%
```

## Installing

```bash
npx harness-score                                       # no install
npm install -g harness-score                            # global binary
npm install --save-dev harness-score                    # pinned devDependency
```

Also mirrored on [GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
(`@paladini/harness-score`) and [JSR](https://jsr.io/@paladini/harness-score)
for Deno/Bun projects.

## CLI reference

```bash
harness-score [path]              # human report (default: current directory)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report (use "-" for stdout)
harness-score --badge badge.svg   # self-contained SVG maturity badge
harness-score --min-level 3       # exit 1 if below L3 — the CI gate
```

## The Cursor plugin

Install **Harness Score** from the [Cursor Marketplace](https://cursor.com/marketplace)
and you get:

- **`/harness-audit`** — runs the scanner on the open workspace and has the
  agent present the report with its top remediations.
- **The `harness-engineering` skill** — when you then say "fix it" or
  "improve my harness", the agent knows how to write the missing artifacts
  following this guide's recipes.

The analysis itself is always the deterministic CLI; the model only presents
results and applies fixes you ask for.

## The CI gate {#ci-gate}

Harnesses regress silently — someone deletes `hooks.json` in a cleanup, a
rules file rots. Ratchet your level in CI:

```yaml
- name: Harness gate
  run: npx -y harness-score --min-level 3
```

Or use the packaged action, which also emits the badge:

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
    badge: 'harness-badge.svg'
```

## Show your maturity {#show-your-maturity}

Harness Score ships **branded SVG badges and banner cards** in the same visual
language as the scanner's progress bars — no shields.io, no paid service, no
network at render time.

### Option A — automatic badge (recommended)

`harness-score --badge` writes an SVG for whatever level the scanner detects.
Wire it into CI once; the README image updates itself as your harness improves.

```yaml
# .github/workflows/harness.yml
name: Harness Score
on: { push: { branches: [main] } }
permissions: { contents: write }
jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score/action@main
        with: { badge: 'harness-badge.svg' }
      - uses: JamesIves/github-pages-deploy-action@v4
        with: { branch: badges, folder: ., clean: false }
```

Reference the published file from your README:

```md
![Harness Score](https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg)
```

Set `height="20"` on the image tag so the badge aligns with shields.io badges
in the same row.

Every badge uses a **fixed 256×20 px layout** (shields.io height, 11px Verdana) so
`L2 · Guided 52%` and `L4 · Self-correcting 100%` render at the same font size.
In your README, set `height="20"` on the `<img>` so it lines up with npm/CI shields:

```md
<img alt="Harness Score" src="https://paladini.github.io/harness-score/harness-badge.svg" height="20">
```

This guide's site dogfoods the pattern — the live badge below is regenerated
on every Pages deploy:

![Harness Score](https://paladini.github.io/harness-score/harness-badge.svg)

The matching banner card for the detected level is published as
`harness-card.svg` (currently L4 for this repository):

![Harness Score banner](https://paladini.github.io/harness-score/harness-card.svg)

### Option B — pin a specific level

Prefer a static image? Pick the badge or banner for your level (`l0`–`l4`):

```md
[![Harness Score](https://paladini.github.io/harness-score/maturity/badge-l3.svg)](https://paladini.github.io/harness-score/)
```

| Level | Compact badge | Share card |
|---|---|---|
| L0 · Unharnessed | [badge-l0.svg](https://paladini.github.io/harness-score/maturity/badge-l0.svg) | [card-l0.svg](https://paladini.github.io/harness-score/maturity/card-l0.svg) |
| L1 · Documented | [badge-l1.svg](https://paladini.github.io/harness-score/maturity/badge-l1.svg) | [card-l1.svg](https://paladini.github.io/harness-score/maturity/card-l1.svg) |
| L2 · Guided | [badge-l2.svg](https://paladini.github.io/harness-score/maturity/badge-l2.svg) | [card-l2.svg](https://paladini.github.io/harness-score/maturity/card-l2.svg) |
| L3 · Sensing | [badge-l3.svg](https://paladini.github.io/harness-score/maturity/badge-l3.svg) | [card-l3.svg](https://paladini.github.io/harness-score/maturity/card-l3.svg) |
| L4 · Self-correcting | [badge-l4.svg](https://paladini.github.io/harness-score/maturity/badge-l4.svg) | [card-l4.svg](https://paladini.github.io/harness-score/maturity/card-l4.svg) |

All five levels at a glance:

<p>
  <img alt="L0 · Unharnessed" src="/maturity/badge-l0.svg" height="20">
  <img alt="L1 · Documented" src="/maturity/badge-l1.svg" height="20">
  <img alt="L2 · Guided" src="/maturity/badge-l2.svg" height="20">
  <img alt="L3 · Sensing" src="/maturity/badge-l3.svg" height="20">
  <img alt="L4 · Self-correcting" src="/maturity/badge-l4.svg" height="20">
</p>

<p>
  <img alt="L0 · Unharnessed" src="/maturity/card-l0.svg" width="100%">
</p>
<p>
  <img alt="L1 · Documented" src="/maturity/card-l1.svg" width="100%">
</p>
<p>
  <img alt="L2 · Guided" src="/maturity/card-l2.svg" width="100%">
</p>
<p>
  <img alt="L3 · Sensing" src="/maturity/card-l3.svg" width="100%">
</p>
<p>
  <img alt="L4 · Self-correcting" src="/maturity/card-l4.svg" width="100%">
</p>

> **shields.io fan?** Your Action can also write a small JSON file and point a
> [shields endpoint](https://shields.io/badges/endpoint-badge) at it
> (`{ "schemaVersion": 1, "label": "harness", "message": "L3 · Sensing", "color": "brightgreen" }`).
> The brand SVGs above are self-contained and need no third party.

## The check catalog {#the-check-catalog}

Every check the scanner runs, with its remediation recipe. Check IDs are
stable; the CLI links each failure to its entry here.

### Context & Guides (20 pts)

#### CTX-01 · Agent context file present — 4 pts {#ctx-01}
An `AGENTS.md` (or `CLAUDE.md`) exists at the repository root.
**Fix:** create `AGENTS.md` answering: what is this project, how do I build
and test it, what conventions hold, what must I never touch. Recipe in
[chapter 3](/guide/guides-feedforward#writing-an-agents-md-that-works).

#### CTX-02 · Context file is substantive — 3 pts {#ctx-02}
≥20 meaningful lines and ≥2 headings — a stub scores nothing.
**Fix:** cover layout, build & test commands, conventions, and no-go zones.
Commands over descriptions; point to rules instead of pasting them.

#### CTX-03 · Cursor rules directory in use — 4 pts {#ctx-03}
At least one `.mdc` file under `.cursor/rules/`.
**Fix:** start with one short always-on rule holding your non-negotiables,
then add glob-scoped rules per area (`api.mdc`, `testing.mdc`).

#### CTX-04 · Rules have valid frontmatter — 3 pts {#ctx-04}
Every rule declares `description`, `alwaysApply`, or `globs`.
**Fix:** add the frontmatter block; without it Cursor can't decide when the
rule applies.

#### CTX-05 · Rules are scoped — 2 pts {#ctx-05}
Not every rule is `alwaysApply: true`.
**Fix:** scope rules with `globs:` so they load only when relevant — every
always-on rule taxes every request's context.

#### CTX-06 · No bloated rules — 2 pts {#ctx-06}
No single rule exceeds 500 lines.
**Fix:** split by concern, or move procedural content into a skill.

#### CTX-07 · README present — 1 pt {#ctx-07}
**Fix:** add a README.md; it's the first orientation document for humans and
a fallback for agents.

#### CTX-08 · No legacy .cursorrules — 1 pt {#ctx-08}
The deprecated single-file format is absent.
**Fix:** migrate `.cursorrules` content into scoped `.cursor/rules/*.mdc`.

### Skills & Commands (12 pts)

#### SKL-01 · At least one skill — 4 pts {#skl-01}
A `SKILL.md` under `.cursor/skills/<name>/` (or `.agents/skills/`).
**Fix:** package your most repeated procedure (deploy, release, migration)
as a skill — [chapter 3](/guide/guides-feedforward#skills-the-procedural-layer).

#### SKL-02 · Skills declare name and description — 3 pts {#skl-02}
Frontmatter with `name:` and `description:` on every skill.
**Fix:** the agent decides whether to load a skill from these two fields
alone; without them the skill is invisible.

#### SKL-03 · Slash commands defined — 3 pts {#skl-03}
Markdown files under `.cursor/commands/`.
**Fix:** encode workflows you trigger deliberately (`/review`, `/release`)
as command files.

#### SKL-04 · Skill descriptions are trigger-worthy — 2 pts {#skl-04}
Descriptions ≥40 characters.
**Fix:** write descriptions as trigger conditions — "Use when the user asks
to deploy or release; covers tagging, pipeline, rollback, smoke tests."

### Hooks & Guardrails (14 pts)

#### HKS-01 · hooks.json present and valid — 4 pts {#hks-01}
`.cursor/hooks.json` exists and parses as JSON.
**Fix:** create it with `{"version": 1, "hooks": {}}` and grow from the
recipes in [chapter 5](/guide/guardrails-and-safety#gate-hooks).

#### HKS-02 · Known events, version declared — 2 pts {#hks-02}
`version` present; every registered event is a documented Cursor event.
**Fix:** typo'd event names fail silently — check against the event list in
[chapter 2](/guide/cursor-harness-surface#hooks-observe-and-control-the-agent-loop).

#### HKS-03 · Gate hook guards risky operations — 4 pts {#hks-03}
A hook on `beforeShellExecution`, `beforeMCPExecution`, `preToolUse`, or
`beforeReadFile`.
**Fix:** add the destructive-command deny gate from chapter 5 — prose rules
are requests; gates are facts.

#### HKS-04 · Feedback hook observes output — 2 pts {#hks-04}
A hook on `afterFileEdit`, `postToolUse`, or similar.
**Fix:** format-and-lint on edit gives the agent instant feedback inside the
session.

#### HKS-05 · Hook scripts committed — 2 pts {#hks-05}
Scripts referenced by hooks.json exist in the repository.
**Fix:** commit them; a hook pointing at a missing script fails open on
every machine but the author's.

### Sensors & Feedback (20 pts)

#### SNS-01 · Test runner configured — 6 pts {#sns-01}
A real test script/config (vitest, jest, pytest, go test, cargo test…).
**Fix:** wire up the runner with one obvious entry point and document it in
AGENTS.md — tests are how the agent verifies its own work.

#### SNS-02 · Linter configured — 5 pts {#sns-02}
eslint/biome, ruff, golangci-lint, rubocop, or equivalent.
**Fix:** every convention expressible as a lint rule stops needing prose.

#### SNS-03 · Type checking in place — 4 pts {#sns-03}
tsconfig (ideally `strict: true`), mypy/pyright, or a statically typed
language.
**Fix:** the type checker is the only sensor that reviews every agent edit
for free — [chapter 4](/guide/sensors-feedback#type-checking-the-free-sensor).

#### SNS-04 · Formatter configured — 3 pts {#sns-04}
prettier/biome, black/ruff-format, gofmt/rustfmt.
**Fix:** formatting noise in diffs hides real mistakes from review.

#### SNS-05 · Test files exist — 2 pts {#sns-05}
At least one actual test file in the tree.
**Fix:** a configured runner with zero tests is a green light nobody earned.

### CI Feedback (14 pts)

#### CI-01 · CI pipeline configured — 4 pts {#ci-01}
GitHub Actions workflow (or GitLab/CircleCI/Jenkins equivalent).
**Fix:** add `.github/workflows/ci.yml` running your sensors on every push.

#### CI-02 · CI runs the tests — 4 pts {#ci-02}
**Fix:** no agent-authored change should be mergeable without the suite
firing.

#### CI-03 · CI runs lint/typecheck — 3 pts {#ci-03}
**Fix:** cheap computational sensors belong on every push — keep quality
left.

#### CI-04 · Pre-commit checks installed — 3 pts {#ci-04}
husky/lint-staged, `pre-commit`, or lefthook.
**Fix:** the earliest feedback a commit can get; catches what on-edit hooks
missed before it enters history.

### Hygiene & Safety (20 pts)

#### HYG-01 · .gitignore present — 2 pts {#hyg-01}
**Fix:** agents commit what they see; make build output and local state
invisible.

#### HYG-02 · .gitignore covers env files — 3 pts {#hyg-02}
A `.env` pattern in .gitignore.
**Fix:** add `.env` and `.env.*` (allow `!.env.example`) — the cheapest
guardrail in existence.

#### HYG-03 · No unprotected .env files — 4 pts {#hyg-03}
No real env files in the tree unless gitignored (templates are fine).
**Fix:** move secrets out; keep `.env.example` documenting required
variables.

#### HYG-04 · MCP config free of credentials — 4 pts {#hyg-04}
No credential signatures in `.cursor/mcp.json`.
**Fix:** use `${ENV_VAR}` interpolation — an inlined key in mcp.json is a
secret published to every clone.

#### HYG-05 · License present — 2 pts {#hyg-05}
**Fix:** add a LICENSE; required for open-source use and the Cursor
Marketplace.

#### HYG-06 · No secrets in harness files — 2 pts {#hyg-06}
AGENTS.md, rules, and hooks config are clean of token signatures.
**Fix:** these files are loaded into model context every session — a key
there is exfiltrated by design.

#### HYG-07 · Lockfile committed — 3 pts {#hyg-07}
package-lock.json, uv.lock, Cargo.lock, go.sum, or equivalent.
**Fix:** reproducible installs mean your sensors test the same dependency
tree everywhere.

## A worked improvement plan

Starting from a typical L0 product repo, one focused session per level:

1. **→ L1 (an afternoon).** Write `AGENTS.md` (CTX-01/02). Include build/test
   commands even if the sensors are weak — the agent will use them.
2. **→ L2 (a day).** Three scoped rules + one skill for your most repeated
   procedure (CTX-03…06, SKL-01/02). Fix hygiene: gitignore, env files,
   license (HYG-01…05).
3. **→ L3 (the real work, if sensors are missing).** Test runner + linter +
   strict types + `ci.yml` running all three (SNS-*, CI-01…03). If you
   already have them, this level is free.
4. **→ L4 (a morning).** The two hooks from chapter 5 — one gate, one
   formatter — committed with their scripts (HKS-*), pre-commit (CI-04),
   then `--min-level 4` in CI so it never regresses.
