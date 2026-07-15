---
name: harness-engineering
description: Use when the user asks to improve, fix, or build their repository's AI harness — AGENTS.md, rules, skills, commands, hooks, guardrails, CI sensors — or to act on harness-score audit findings and raise their maturity level.
---

# Harness Engineering — remediation recipes

You are improving this repository's AI harness: the guides, sensors, and
guardrails that make agent work reliable. The authoritative reference is
https://paladini.github.io/harness-score/ — these recipes summarize it.

## Ground rules

- Prefer running `npx -y harness-score . --json` first (and after changes)
  so improvements are measured, not assumed.
- Fix in points order: the failed checks worth the most points first, unless
  the user picks specific ones.
- Write harness files that match THIS repository — read the codebase enough
  to state real commands, real directories, real conventions. Never ship
  placeholder text like "<your build command>".
- Keep context lean: AGENTS.md ≤150 lines; scope guidance where the tool
  supports it; put procedures in skills, not rules.

## Recipes by check family

### CTX — Context & Guides
Create `AGENTS.md` with: what the project is (2 sentences), directory
layout, exact build/test/lint commands, non-negotiable conventions, and a
"do not touch" list.

<!-- SLOT:ctx-rules -->

### SKL — Skills & Commands
For the team's most repeated procedure, create
`{{SKILLS_DIR}}/<name>/SKILL.md` with frontmatter `name:` and a
`description:` written as a trigger ("Use when the user asks to …", ≥40
chars), body = numbered runbook. Add `{{COMMANDS_DIR}}/<verb>.md` for
human-triggered workflows like /review.

### HKS — Hooks & Guardrails
<!-- SLOT:hooks -->

### SNS — Sensors
Wire the ecosystem's standard tools: test runner with a `test` script,
linter config, strict type checking (tsconfig `"strict": true` / mypy /
pyright), formatter. Document the commands in AGENTS.md.

### CI — CI Feedback
`.github/workflows/ci.yml` running lint, typecheck, and tests on push/PR.
Optionally add the ratchet: `npx -y harness-score --min-level <current>`.
Pre-commit via husky+lint-staged or pre-commit.

### HYG — Hygiene & Safety
`.gitignore` must cover `.env` and `.env.*` (keep `!.env.example`). Remove
real env files; replace inlined keys in `{{MCP_CONFIG_PATH}}` with
`${ENV_VAR}` interpolation. Add LICENSE and commit the lockfile.

## After fixing

Re-run the scanner, report old level → new level, and if the user wants it
to stick, add the `--min-level` gate to CI so maturity only ratchets up.
