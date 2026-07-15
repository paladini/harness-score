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
  - `src/checks/` — one file per dimension (see `.cursor/rules/checks.mdc`)
  - `src/score.ts` — the maturity model (levels L0–L4)
- `docs/` — the VitePress guide. `docs/guide/measure-and-improve.md` holds
  the check catalog with one `{#<check-id>}` anchor per check.
- `plugins/` — one directory per tool (`cursor/`, `claude-code/`, …), plus
  `shared/` holding the single prose source templated into each
  (`npm run plugins:generate`, checked by `npm run plugins:sync-check`).
  Root `.claude-plugin/marketplace.json` lists the Claude Code entry.
- `action/` — composite GitHub Action wrapping the CLI.
- `fixtures/level-0..4/` — sample repos pinned to each maturity level by
  tests. Changing a check usually changes a fixture.

## Build & test

- `npm test` — builds the CLI (`tsup`), typechecks `src/` and the
  packaging-level consumer smoke test (`test/types/smoke.ts`, imports from
  `dist/`, not `src/`), then runs vitest.
- `npm run lint` — Biome (lints + checks formatting).
- `npm run scan` — self-audit; must report L4.
- `npm run docs:build` — builds the guide; must pass (dead links fail it).
- `npm run bench` (in `packages/cli/`) — scan-time benchmark against a
  synthetic large repo; use it before/after touching `scan.ts`.
- Tests MUST pass before any commit.

## Non-negotiable conventions

- The CLI stays 100% deterministic: no LLM calls, no network, no telemetry,
  no `Date.now()`-dependent output. Filesystem reads and parsing only.
- `packages/cli` keeps **zero runtime dependencies** (fast `npx`, no supply
  chain surface). Dev dependencies are fine.
- The maturity model lives in three places that must change together:
  `src/score.ts` (implementation), `docs/guide/maturity-model.md` (levels
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
