# Agent Guide — harness-score

## What this is

A monorepo shipping AI coding harness engineering as a product: a guide
(VitePress → GitHub Pages), the deterministic, harness-agnostic
`harness-score` CLI, a growing family of thin per-tool plugins under
`plugins/` (Cursor is the flagship/most fully-developed target; see
`PLUGINS-ROADMAP.md` for the others), and a GitHub Action. The repo
dogfoods its own scanner: it must always score **L4** (`npm run scan`).

## Layout

- `packages/cli/` — the scanner. TypeScript, ESM, **zero runtime deps**.
  - `packages/cli/src/checks/` — one file per dimension (see `.cursor/rules/checks.mdc`)
  - `packages/cli/src/score.ts` — the maturity model (levels L0–L4)
- `docs/` — the VitePress guide. `docs/guide/measure-and-improve.md` holds
  the check catalog with one `{#<check-id>}` anchor per check.
- `plugins/` — one directory per tool (`cursor/`, `claude-code/`, …), plus
  `shared/` holding the single prose source templated into each
  (`npm run plugins:generate`, checked by `npm run plugins:sync-check`).
  Root `.claude-plugin/marketplace.json` lists the Claude Code entry.
- `action/` — composite GitHub Action wrapping the CLI.
- `fixtures/level-0..4/` — sample repos pinned to each maturity level by
  tests. Changing a check usually changes a fixture.

Project-local agent skill:

- `.agents/skills/pr-release-audit/SKILL.md` — complete PR/release audit,
  including current official vendor documentation, site/docs parity, release
  metadata, and explicit contributor credit. Use it for PR and release work;
  its release-note and attribution gates are mandatory.
- `.agents/skills/tlc-discover/SKILL.md`, `.agents/skills/tlc-plan/SKILL.md`,
  `.agents/skills/tlc-implement/SKILL.md`, and
  `.agents/skills/the-judge/SKILL.md` — the TLC AI Dev Flow. Route work through
  these skills as described in [AI-DEV-FLOW.md](AI-DEV-FLOW.md); do not
  substitute `tlc-spec-driven` for this workflow.

## TLC AI Dev Flow

Use the smallest applicable entry point:

- Unshaped feature, unclear problem, or consequential direction choice:
  `tlc-discover`.
- Decided work that still needs observable vertical slices: `tlc-plan`.
- Concrete ticket, task, or reproducible bug whose expected behavior is
  already decided: `tlc-implement`.
- Pull-request code review: `the-judge`. This does not replace
  `pr-release-audit` for merge or release readiness.

Do not force the full flow onto typo-only or similarly trivial, reversible
changes. TLC artifacts are written in the request's language, while headings
required by the skills and code identifiers remain literal.

## tlc-implement

profile: standard
handoff: on

Harness-Score proof rules:

- Each check names a focused proof. The final feature gate still runs
  `npm test`, `npm run lint`, `npm run scan`, `npm run docs:build`, and
  `npm run plugins:sync-check` when the affected surface makes it relevant.
- A new behavioral test must fail against the feature base before the
  implementation is accepted as proof. Never weaken, delete, or silently
  rewrite a pre-existing test to obtain green.
- The author does not verify their own implementation. A fresh verifier reads
  the complete checklist and `<feature-base>..HEAD` diff.
- Local edits and commits stay within the approved checklist. Pushes, deploys,
  production changes, and posting a GitHub review require explicit user
  authorization.

## Build & test

- `npm test` — builds the CLI (`tsup`), typechecks `packages/cli/src/` and the
  packaging-level consumer smoke test (`packages/cli/test/types/smoke.ts`, imports from
  `dist/`, not `src/`), then runs vitest.
- `npm run lint` — Biome (lints + checks formatting).
- `npm run scan` — self-audit; must report L4.
- `npm run docs:build` — builds the guide; must pass (dead links fail it).
- `npm run bench` — scan-time benchmark against a synthetic large repo; use it
  before/after touching `packages/cli/src/scan.ts`.
- Tests MUST pass before any commit.

## Non-negotiable conventions

- The CLI stays 100% deterministic: no LLM calls, no network, no telemetry,
  no `Date.now()`-dependent output. Filesystem reads and parsing only.
- `packages/cli` keeps **zero runtime dependencies** (fast `npx`, no supply
  chain surface). Dev dependencies are fine.
- The maturity model lives in three places that must change together:
  `packages/cli/src/score.ts` (implementation), `docs/guide/maturity-model.md` (levels
  + dimension point totals), `docs/guide/measure-and-improve.md` (check
  catalog). `packages/cli/test/docs.test.ts` and
  `packages/cli/test/maturity-sync.test.ts` enforce that check IDs, points,
  dimension totals, and level thresholds all stay in sync across every one
  of those three files — not just anchors in the check catalog.
- Check IDs (`CTX-01`, …) are public API: never renumber or reuse them.
- `Check.run(ctx)` and `ScanContext.read()`/`.matching()` are synchronous
  by contract — part of the public API (`packages/cli/src/index.ts`).
  Don't make them async as a perf fix; that's a breaking (major-version)
  change, not a drive-by tweak.
- User-facing changes get a changeset (`npm run changeset` at the repo
  root) in the same PR — see `RELEASING.md`.

## Do not touch

- `fixtures/` files unless you are deliberately changing what a maturity
  level means — they are test assertions, not examples to "improve".
- Version numbers are bumped by the release skill, not ad hoc.
