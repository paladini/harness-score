# harness-score

**Deterministic harness-maturity scanner for AI-assisted repositories —
Cursor-first, zero LLM calls.**

[![npm](https://img.shields.io/npm/v/harness-score)](https://www.npmjs.com/package/harness-score)
[![guide](https://img.shields.io/badge/guide-github%20pages-blue)](https://paladini.github.io/harness-score/)
[![license](https://img.shields.io/badge/license-MIT-green)](https://github.com/paladini/harness-score/blob/main/LICENSE)

`harness-score` measures how well a repository is set up for reliable
AI-assisted development: `AGENTS.md`, Cursor rules/skills/commands/subagents,
hooks, tests/linters/types, CI, and secret hygiene. It scores 36 checks
across 6 dimensions and reports a maturity level from **L0 (Unharnessed)**
to **L4 (Self-correcting)**.

The scan reads your filesystem and parses config — that's it. No network
calls, no telemetry, no model in the loop. Same repo in, same score out,
every time.

Full rubric, check catalog, and remediation guide:
**[paladini.github.io/harness-score](https://paladini.github.io/harness-score/)**

## Install

```bash
# run once, no install
npx harness-score

# install globally
npm install -g harness-score
harness-score

# install as a dev dependency (recommended for CI reproducibility)
npm install --save-dev harness-score
```

Also published on [GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
as `@paladini/harness-score` and on [JSR](https://jsr.io/@paladini/harness-score)
for Deno/Bun users.

## Usage

```bash
harness-score [path]              # human-readable report (default: cwd)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report ("-" for stdout)
harness-score --badge badge.svg   # SVG pill: harness + detected level (L0–L4)
harness-score --min-level 3       # exit 1 if below L3 — the CI gate
```

Example:

```
  harness-score v0.3.0  /work/my-app

  Maturity: L2 · Guided   Score: 66/108 (61%)

  Context & Guides     ████████████████░░░░  80%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  ...
  To reach L3: sensors ≥ 60%; ci ≥ 50%
```

## Programmatic API

```ts
import { score } from 'harness-score';

const report = score('/path/to/repo');
console.log(report.level.index, report.level.name, report.score.percent);
```

`Report`, `Check`, `DimensionScore`, and every other shape are exported as
TypeScript types, resolved via an explicit `"types"` field — no extra
config needed in a consuming project. `dist/` is a small, bundled build
(`tsup`, ESM only); verified against `attw` and a packaging-level type
smoke test in CI, and against a real `npm pack` install in an external
project before each release.

## CI gate

```yaml
- run: npx harness-score --min-level 3
```

Or use the [packaged GitHub Action](https://github.com/paladini/harness-score/tree/main/action),
which also emits the badge.

Two branded SVG formats (README badge + share card). Copy-paste embeds:
[Embed snippets](https://paladini.github.io/harness-score/guide/measure-and-improve#embed-snippets).
Gallery and CI wiring:
[Show your maturity](https://paladini.github.io/harness-score/guide/measure-and-improve#show-your-maturity).

## Cursor plugin

Install **Harness Score** from
[its plugin directory in this repo](https://github.com/paladini/harness-score/tree/main/plugin)
for a `/harness-audit` command and a remediation skill that fixes gaps
directly in your editor. (Cursor Marketplace listing submitted, pending
review.)

## License

MIT — [github.com/paladini/harness-score](https://github.com/paladini/harness-score)
