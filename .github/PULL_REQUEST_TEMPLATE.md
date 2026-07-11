## What & why

<!-- What does this change, and what problem does it solve? Link an issue if there is one. -->

## Type of change

- [ ] Bug fix (false positive/negative in a check, incorrect output)
- [ ] New or changed check (rubric change — see checklist below)
- [ ] Docs
- [ ] Other (plugin, GitHub Action, tooling)

## Rubric-change checklist (skip if not touching `score.ts`/checks)

- [ ] `packages/cli/src/checks/*.ts` updated
- [ ] `docs/guide/maturity-model.md` updated to match
- [ ] `docs/guide/measure-and-improve.md` (check catalog) updated to match
- [ ] `fixtures/level-0..4/` updated so the maturity ladder still makes sense
- [ ] Check IDs were **not** renumbered or reused

## Checklist

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run scan` still reports **L4** for this repo
- [ ] `npm run docs:build` passes (if docs changed)
