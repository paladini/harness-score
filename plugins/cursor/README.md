# Harness Score — Cursor Plugin

Measure how well-harnessed your repository is for AI-assisted development —
deterministically, with zero LLM calls — and let the agent fix the gaps.

## What you get

- **`/harness-audit`** — runs [`harness-score`](https://www.npmjs.com/package/harness-score)
  (a pure filesystem scanner: 36 checks, 6 dimensions, 5 maturity levels)
  on your workspace and presents the report with the top remediations.
- **`harness-engineering` skill** — when you ask to "improve my harness" or
  "fix the audit findings", the agent follows the guide's recipes to write
  your AGENTS.md, scoped rules, skills, gate hooks, and CI sensors.

The analysis itself never uses AI: results are reproducible, diffable, and
CI-gateable. The model only presents findings and applies fixes you request.

## The maturity model

| Level | Name | Gate |
|---|---|---|
| L0 | Unharnessed | — |
| L1 | Documented | substantive AGENTS.md |
| L2 | Guided | scoped rules + skills/hooks + hygiene |
| L3 | Sensing | tests, linter, types + CI |
| L4 | Self-correcting | gate & feedback hooks + ≥80% overall |

Full maturity model, check catalog, and remediation guide:
**https://paladini.github.io/harness-score/**

## Requirements

- Node.js ≥18 available in the workspace (the command uses `npx`).

## Privacy

The scanner reads your working tree locally. No network calls, no telemetry,
nothing leaves your machine.

## License

MIT — source at https://github.com/paladini/harness-score
