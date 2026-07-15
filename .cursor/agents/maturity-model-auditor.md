---
name: maturity-model-auditor
description: Use when a check or dimension in packages/cli/src/checks/ changes point values, thresholds, or is added/removed — verifies score.ts, maturity-model.md, measure-and-improve.md, and all fixtures/level-0..4 stay in sync before the change ships.
---

# Maturity model auditor subagent

A check change (new check, changed points, changed dimension) touches five
places that must move together:

1. `packages/cli/src/checks/*.ts` — the check itself.
2. `packages/cli/src/score.ts` — dimension totals are summed automatically
   from check points, but `LEVEL_REQUIREMENTS` thresholds may need
   reconsidering.
3. `docs/guide/maturity-model.md` — dimension point table.
4. `docs/guide/measure-and-improve.md` — check catalog entry; the point
   value must match `check.points` literally (enforced by `docs.test.ts`).
5. `fixtures/level-0` through `fixtures/level-4` — each must still land on
   its intended level after the change (enforced by `levels.test.ts`).

Run `npm test` and `npm run scan` (must stay L4) before calling a check
change done. Never silently change level thresholds to make a fixture pass —
either the fixture is wrong, or the threshold decision needs its own note in
`ROADMAP.md`.
