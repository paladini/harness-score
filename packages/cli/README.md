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

Repository discovery walks the complete relevant filesystem tree without a
production depth cap, including tracked, untracked, and ignored files. Known
dependency and generated directories are skipped, followed symlink targets
must remain inside the scan root, and file bodies above 512 KiB are not read. A
1,000,000-file emergency fuse protects against pathological trees; reaching it,
finding an out-of-root symlink, or encountering an unreadable relevant path
marks the affected snapshot as incomplete instead of authoritative.

Full maturity model, check catalog, and remediation guide:
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
as `@paladini/harness-score` and on [JSR](https://jsr.io/@paladini/harness-score).
To run the JSR CLI with Deno, allow it to read the repository and environment:

```bash
deno run --allow-read --allow-env jsr:@paladini/harness-score/cli .
```

Pin a package version in automated workflows for reproducible results. The
scanner requires local filesystem access and is not a browser or edge-worker
package.

## Usage

```bash
harness-score [path]              # human-readable report (default: cwd)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report ("-" for stdout)
harness-score --badge badge.svg   # SVG pill: harness + detected level (L0–L4)
harness-score --min-level 3       # exit 1 if below L3 — the CI gate
harness-score --references        # also check the references written in AGENTS.md, rules, skills and specs
```

### Reference check (`--references`)

`--references` adds an informational section that checks whether the files,
directories, glob patterns and Markdown anchors cited in `AGENTS.md`,
`CLAUDE.md`, `GEMINI.md`, scoped rules, skills and OpenSpec documents exist in
the repository. Each occurrence is reported with its position and one of five
states: consistent, inconsistent, not evaluable, not supported or ambiguous.

It is opt-in and purely additional: without the flag the output is unchanged,
and with it the score, the level and the exit code are unchanged too. In the
JSON report the result is the optional `references` field, kept apart from
`checks`. Documents under example, tutorial, fixture or demo directories and
archived spec changes are listed but not checked. The check reads files only:
no network, no commands, nothing outside the scanned root.

When the repository has an OpenSpec layout (`openspec/specs/`,
`openspec/changes/`), the section also reports three independent properties:
whether the structure is there, whether each active document has minimum
content (a heading and some body; a `tasks.md` needs a list item), and the
states of the references those documents contain. It never judges what the
specification says, and there is no combined verdict.

The exact rules (what counts as a reference, every outcome and its rule id, the
glob language and the anchor convention) are in
[REFERENCE-CHECK.md](REFERENCE-CHECK.md).

Example:

```
  harness-score v1.0.0  /work/my-app

  Maturity: L2 · Guided   Score: 66/108 (61%)
  Detected: Cursor, Claude Code

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

For Deno, the same API is available from JSR:

```ts
import { score } from 'jsr:@paladini/harness-score@1';

const report = score('.');
console.log(report.level.name);
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

The exit status follows the snapshot selected by `--gate`. An incomplete gated
snapshot exits 2. If `maturity` is complete and only an additional `effective`
scope is incomplete, `--gate maturity` can still pass and reports the effective
snapshot as unavailable. JSON output keeps incomplete values for diagnosis and
marks their authority through `verdicts`.

Or use the [packaged GitHub Action](https://github.com/paladini/harness-score/tree/main/action),
which also emits the badge.

Two branded SVG formats (README badge + share card). Copy-paste embeds:
[Embed snippets](https://paladini.github.io/harness-score/guide/measure-and-improve#embed-snippets).
Gallery and CI wiring:
[Show your maturity](https://paladini.github.io/harness-score/guide/measure-and-improve#show-your-maturity).

## Cursor plugin

Install **Harness Score** from
[its plugin directory in this repo](https://github.com/paladini/harness-score/tree/main/plugins/cursor)
for a `/harness-audit` command and a remediation skill that fixes gaps
directly in your editor. (Cursor Marketplace listing submitted, pending
review.)

## License

MIT — [github.com/paladini/harness-score](https://github.com/paladini/harness-score)
