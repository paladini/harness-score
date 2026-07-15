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

For guidance scoped to part of the tree, add a nested `CLAUDE.md`
inside that subdirectory — Claude Code loads it automatically when working
in that subtree, the same idea as glob-scoped rules in other tools, just
directory-scoped instead of pattern-scoped.

### SKL — Skills & Commands
For the team's most repeated procedure, create
`.claude/skills/<name>/SKILL.md` with frontmatter `name:` and a
`description:` written as a trigger ("Use when the user asks to …", ≥40
chars), body = numbered runbook. Add `.claude/commands/<verb>.md` for
human-triggered workflows like /review.

### HKS — Hooks & Guardrails
Register hooks in `.claude/settings.json`'s `"hooks"` key:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-shell.js" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/format-on-edit.js" }]
      }
    ]
  }
}
```

The gate script reads the tool-call JSON from stdin on `PreToolUse`, tests
the command against a destructive-pattern regex (rm -rf on roots, git push
--force, DROP TABLE), and — to block it — prints
`{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}`
and exits 0. The feedback script runs on `PostToolUse` and formats the
edited file, best-effort. Commit both scripts. Full examples:
https://paladini.github.io/harness-score/guide/guardrails-and-safety

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
real env files; replace inlined keys in `.mcp.json` with
`${ENV_VAR}` interpolation. Add LICENSE and commit the lockfile.

## After fixing

Re-run the scanner, report old level → new level, and if the user wants it
to stick, add the `--min-level` gate to CI so maturity only ratchets up.
