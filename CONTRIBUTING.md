# Contributing to Harness Score

Thanks for considering a contribution — issues, pull requests, and
discussion are all welcome. This project is small enough that a short read
here should be all you need before opening a PR.

## Ways to contribute

- **Report a false positive/negative.** The scanner is deterministic pattern
  matching; it will occasionally misjudge a real repository (a linter it
  doesn't recognize, a rule format it doesn't parse). These reports are the
  most valuable contribution there is — see
  [tech-leads-club/fakeflix](https://github.com/tech-leads-club/fakeflix) in
  our own history for an example of a real-world test that shipped several
  fixes.
- **Propose or add a check.** New tools, new conventions, new artifacts worth
  rewarding. See [ROADMAP.md](ROADMAP.md) for what's already planned.
- **Improve the guide.** Docs fixes, clearer recipes, better examples.
- **Fix a bug** in the CLI, the plugin, or the GitHub Action.

Open an issue before a large PR (a new check, a rubric change) so we can
agree on the approach first — rubric changes touch multiple files that must
stay in sync (see below) and are easiest to get right with agreement up
front. Small fixes (typos, docs, obvious bugs) can go straight to a PR.

## Project layout

```
packages/cli/    the scanner — TypeScript, ESM, zero runtime dependencies
  src/checks/    one file per dimension
  src/score.ts   the maturity rubric (levels L0–L4)
  test/          vitest; fixtures/level-0..4 pin each maturity level
docs/            the VitePress guide (deploys to GitHub Pages)
plugin/          the Cursor Marketplace plugin
action/          the composite GitHub Action wrapping the CLI
```

Full conventions — written for agents, equally useful for humans — live in
[AGENTS.md](AGENTS.md). Read it before touching `packages/cli`.

## The three invariants that matter most

1. **The CLI stays deterministic.** No LLM calls, no network, no telemetry,
   no `Date.now()`-dependent output. Filesystem reads and parsing only — a
   PR that breaks this will be asked to change approach.
2. **Zero runtime dependencies in `packages/cli`.** Fast `npx`, no supply
   chain surface. Dev dependencies are fine.
3. **The rubric lives in three places that must change together:**
   `packages/cli/src/score.ts` (implementation),
   `docs/guide/maturity-model.md` (levels),
   `docs/guide/measure-and-improve.md` (check catalog). A docs-sync test
   enforces that check IDs, points, and anchors match across all three —
   `npm test` will fail loudly if you update one and not the others.

Check IDs (`CTX-01`, `SNS-03`, …) are public API: never renumber or reuse
one, even if a check is removed.

`.github/CODEOWNERS` auto-requests review on PRs touching checks, the
rubric, the maturity docs, fixtures, or the release workflow — not a
gate, just a heads-up on the highest-stakes paths in the repo.

## Adding or changing a check

This is the highest-value contribution and the one most likely to need a
design discussion first, because it changes what every existing repository
scores:

1. Open an issue using the **[Rubric change](https://github.com/paladini/harness-score/issues/new?template=rubric_change.yml)**
   template, describing the artifact you want to detect and why it deserves
   points (or why an existing check's points/logic should change, or why a
   check should be removed).
2. Implement the check in the relevant `packages/cli/src/checks/*.ts`,
   wire it into the dimension total, and add/update fixtures under
   `fixtures/level-0..4/` so the maturity ladder still makes sense at every
   level.
3. Update `docs/guide/maturity-model.md` and
   `docs/guide/measure-and-improve.md` in the same PR — `packages/cli/test/docs.test.ts`
   and `packages/cli/test/rubric-sync.test.ts` enforce that check IDs,
   points, dimension totals, and level thresholds all stay in sync across
   `score.ts` and both docs pages; `npm test` fails loudly otherwise.
4. Run the full gate before opening the PR (see below).

## Before opening a PR

```bash
npm install
npm test            # build + vitest — must pass
npm run lint         # biome — lints and checks formatting
npm run scan         # self-audit — this repo must stay at L4
npm run docs:build   # builds the guide — dead links fail it
```

CI runs the same checks; a red run will block review.

If your change is user-facing (a new/changed check, a CLI flag, a bug fix a
user would notice), add a changeset: `npm run changeset`, pick a bump type,
and describe the change — it becomes an entry in `packages/cli/CHANGELOG.md`
the next time a maintainer runs the release process. Skip it for
docs-only/internal changes.

## Releasing

Releases (versioning, publishing to npm/GitHub Packages/JSR, docs deploy) are
handled by a maintainer — see [RELEASING.md](RELEASING.md) if you're picking
that up.

## Code of conduct

Participation in this project is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).
