# Roadmap

Harness Score is pre-1.0 and the maturity model is expected to keep evolving as we
test it against real repositories. This document tracks what's already
planned so contributors (and future sessions) don't duplicate discovery
work. It is not a promise of dates — just of intent and design direction.

For the invariants any check change must respect, see
[AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md#the-three-invariants-that-matter-most).

## Why the maturity model still moves

`v0.1.2` was a real-world test against
[tech-leads-club/fakeflix](https://github.com/tech-leads-club/fakeflix), a
genuinely excellent AI-harness example repo. That test fixed several parser
bugs (frontmatter block scalars, hook tokenization, monorepo test-runner
detection, symlink traversal) but also surfaced two things the maturity model
**didn't reward at all**, even though fakeflix uses them heavily and our own
guide already documented them as core Cursor harness artifacts. Both shipped
in `v0.2.0`.

## Shipped in v0.2.0

### 1. Custom subagent definitions (`.cursor/agents/*.md`) — done

Two new checks, `AGT-01` (existence, 3 pts) and `AGT-02` (frontmatter
declares `name`/`description`, 2 pts), in the new
`packages/cli/src/checks/agents.ts`, mirroring the `SKL-01`/`SKL-02`
pattern. Folded into the existing **Skills & Commands** dimension (grown
12 → 17 pts) rather than a new dimension, per the original leaning below.

### 2. Positive MCP configuration check — done

`HYG-08` (3 pts) rewards a valid, parseable `.cursor/mcp.json` where any
credential-shaped field (token/key/secret/password) uses `${ENV_VAR}`
interpolation — the positive complement to `HYG-04`'s negative gate.
Folded into **Hygiene & Safety** (grown 20 → 23 pts).

**Total maturity model points moved 100 → 108.** Rather than trimming four unrelated
dimensions to preserve the round "100" number, only the two dimensions that
gained checks grew — this kept the change scoped to
`checks/agents.ts`, `checks/hygiene.ts`, and their two dimensions' entries
in `maturity-model.md`/`measure-and-improve.md`, instead of rippling through
every check's point value. `LEVEL_REQUIREMENTS` in `score.ts` is
percentage-based per dimension (and for the L4 total gate), so no threshold
formula changed — only fixtures needed new example artifacts to keep their
intended level. `fixtures/level-3` and `level-4` gained a `.cursor/agents/`
subagent; `level-4` also gained a well-formed `.cursor/mcp.json`. This
repository's own `.cursor/agents/maturity-model-auditor.md` and `.cursor/mcp.json`
keep it dogfooding **L4**. The stale, copy-pasted `fixtures/level-2..4`
READMEs (all describing level-1 content) were fixed while fixtures were
being touched anyway.

## Shipped in v0.3.0

### `--diff` mode + GitHub Action PR comments — done

The single biggest gap for driving adoption was that the GitHub Action only
wrote a job summary — it never commented on PRs — and there was no
`--diff`/`--since` mode anywhere in the CLI. A PR comment reading "harness
score moved from L2 to L3 in this PR" is the kind of visible, recurring
touchpoint that makes a CI tool sticky.

**Shipped:**
- `packages/cli/src/diff.ts`: `computeDiff(baseline, current)` — level
  delta, score delta, per-dimension deltas, and which checks flipped
  pass/fail. Pure comparison of two already-computed `Report` objects, no
  new runtime deps, fully deterministic. Checks present in `current` but
  absent from `baseline` (a check change between scans) are ignored for
  the pass/fail delta rather than counted as a regression.
- CLI flag `--diff <baseline.json>` (see
  [Tracking score over time](docs/guide/measure-and-improve.md#diff-mode)),
  rendered in terminal, markdown, and JSON output (`--json --diff` adds
  `current`/`baseline`/`diff` to the payload).
- `action/action.yml` gained an opt-in `comment` input: on `pull_request`
  events, it scans the base branch's tip into a temporary `git worktree`,
  diffs it against the head scan, and posts/updates a single sticky PR
  comment via `actions/github-script` (matched by a hidden HTML marker so
  repeated pushes update one comment). Requires the consumer to grant
  `pull-requests: write` — documented in `action/README.md`, not assumed.

## Planned for v1.0.0

### Site redesign, docs expansion, and multi-tool branding — in progress

The v1.0.0 release marks the project's transition from "Cursor-focused tool" to
"universal harness maturity platform." Key work:

- **Site redesign**: HomeLanding.vue enhancements, clearer tool-agnostic messaging,
  prominent call-out that any AI tool benefits from the same harness.
- **Docs expansion**: New "Multi-Harness Support" chapter (added in v0.5.0 docs
  reorg) explaining OR semantics, supported tools table, migration patterns,
  and FAQs. Updated landing page and navigation to surface multi-tool story first.
- **Updated README**: Multi-tool language, clarified that Cursor is the flagship
  but not exclusive, mention of Claude Code, Windsurf, and others gaining first-class
  support in plugins over time.
- **Plugin roadmap clarity**: Formalize the staggered plugin launch — Cursor
  (v0.x shipped), Claude Code (Phase 0 read-only audit), Windsurf and others
  TBD. **[PLUGINS-ROADMAP.md](PLUGINS-ROADMAP.md)** exists; keep it
  consumer-facing and current as phases land.

**Rationale:** v0.4.0 shipped the *engine* (multi-harness OR semantics in the
scanner). v1.0.0 ships the *story* — making it clear that this tool measures
harness maturity *across tools* and that a single well-built harness benefits
every AI agent in your workflow. No check changes, no maturity-model shifts — just
clarity and docs.

## Shipped in v0.4.0

### Distribution, type packaging, scan performance, and community infra — done

Not a check change (no checks added, no points moved) — a maintenance pass
on the CLI's packaging and the contribution process itself:

- **Smaller, bundled `dist/`.** The build moved from plain `tsc` (36
  unbundled files, ~82KB) to `tsup` (5 files, ~54KB via splitting +
  minification). `package.json` gained an explicit `"types"` field and a
  `"types"` condition in `"exports"`.
- **Verified type packaging.** `test/types/smoke.ts` type-checks every
  public symbol against the *built* `dist/` output (not `src/`) via a new
  `typecheck:consumer` script, and `attw --pack . --profile esm-only` runs
  in CI — both catch a wrong `"types"` path or missing re-export that
  vitest's runtime tests (which import from `src/`) never would.
- **Scan performance.** `ctx.matching(re)` is memoized per regex
  source+flags in `createScanContext` — several checks already re-query
  the same pattern independently (every `CTX-03..06` rule check calls
  `matching(RULE_RE)`). ~7% faster on a 20k-file synthetic benchmark
  (`npm run bench`, new). Deliberately did **not** parallelize file reads:
  `Check.run()`/`ScanContext.read()` are synchronous public API, and
  making them async would be a breaking change, not a perf tweak.
- **Maturity model doc-sync gap closed.** `maturity-model.md`'s dimension-points
  table and `LEVEL_REQUIREMENTS` thresholds were only mirrored by hand
  ("change both together" in a comment); `maturity-sync.test.ts` now
  enforces both in CI, the same way `docs.test.ts` already enforced
  `measure-and-improve.md`.
- **Formalized the contribution process.** A dedicated
  `.github/ISSUE_TEMPLATE/check_change.yml` for add/edit/remove-a-check
  proposals, `.github/CODEOWNERS` (routes checks/maturity-model/release-surface
  PRs for review), `.github/dependabot.yml` (weekly devDependency +
  Actions updates — `packages/cli` still has zero runtime dependencies),
  and changesets (`npm run changeset` / `npm run version-packages`) for a
  real `packages/cli/CHANGELOG.md` instead of relying only on GitHub's
  auto-generated release notes.
- **Non-breaking, verified.** A new `golden-output.test.ts` snapshots the
  `Report` JSON for every fixture and this repo's own self-scan; a real
  external-consumer test (`npm pack`, install the tarball in a throwaway
  project, run the bin directly and via `npx`, `import` the library, and
  `tsc --noEmit` against a consumer script) confirmed nothing broke for
  existing users of the CLI or the library.

## Why these aren't quick adds

Both `v0.2.0` features added a **positively-weighted check**, which shifts
the earned/max ratio for every dimension total and therefore every existing
fixture under `fixtures/level-0..4/`. That's why they shipped together as a
deliberate check-change PR rather than a drive-by fix — see the "Shipped in
v0.2.0" section above for what that PR touched. Any future check addition
should expect the same shape of change: check → dimension total → both docs
pages → all five fixtures → this repo's own dogfood artifacts if needed.

## Shipped in v0.5.0

### Multi-harness equivalence fixes — done

After field-testing v0.4.0 against a corpus of differently-shaped repositories,
three equivalence gaps were found and closed:

- **Hooks regression:** A hook-less `.claude/settings.json` (permissions only)
  no longer shadows a fully-configured `.cursor/hooks.json` — of all hooks
  configs, the one with the most registered events wins.
- **CTX-04 path fix:** `.continue/rules/*.md` without frontmatter now pass at
  the repository root (previously only in subdirectories).
- **CTX-03/04/05 nested files:** `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` in
  subdirectories now count as scoped rules — a fully-harnessed Claude Code
  repo can progress past L1 without `.cursor/` paths.

Also shipped: comprehensive multi-harness docs (new "Multi-Harness Support"
chapter), site messaging updates (docs.index, nav, HomeLanding.vue), and
README clarifications about OR-semantic scoring across tools.

## Shipped in v0.6.0

### Detected harnesses in human-readable reports — done

The `detectedHarnesses` array (in `--json` since v0.4.0) is now surfaced in
the terminal report (`Detected: Cursor, Claude Code` under the maturity
header) and the markdown report (`**Detected harnesses:**`). Display names
live in `TOOL_DISPLAY_NAMES` in the harness registry, exported publicly with
`toolDisplayName()` and the `ToolId` type. Empty list renders nothing, so
zero-harness output is unchanged. Shipped alongside a Cursor plugin `0.1.1`
content-only bump (terminology + `plugins/` move regularized).

Known model note carried forward (not addressed here): `detectHarnesses`
reports antigravity+codex together for shared `.agents/` paths, and
`fixtures/`-style example directories inflate a root repo's detected list via
`(^|\/)` path matching — both candidates for a v1.0.0 pass.

## Also under consideration (not yet scheduled)

- **`harness-score init`** — a scaffold command that generates starter
  artifacts (an `AGENTS.md`, a Cursor rule, a `hooks.json`) for the
  highest-value missing checks, turning the tool from a diagnostic into a
  fixer. The biggest remaining adoption lever, but big enough to warrant its
  own design session (deterministic templates only, no LLM — keeps the
  zero-runtime-deps and no-network invariants).
- **SARIF output** for GitHub code-scanning tab integration.
- Recognizing more linters/test runners/type checkers as the ecosystem
  detector (`detectEcosystems`) sees them in the wild — this is the kind of
  contribution that needs no design discussion, just a PR (see
  [CONTRIBUTING.md](CONTRIBUTING.md)).
- Shipping harness-score as a plugin for other tools (Claude Code, Windsurf,
  Codex CLI, VS Code), not just Cursor, all published from this same repo —
  planned in [PLUGINS-ROADMAP.md](PLUGINS-ROADMAP.md), in progress (Claude Code
  Phase 0 audit command shipped; full plugin suite post-v1.0).

## Proposing something new

Open an issue using the **[Check change](https://github.com/paladini/harness-score/issues/new?template=check_change.yml)**
template for anything that adds, edits, or removes a check; the general
**feature request** template covers everything else (CLI flags, plugin,
Action, docs). See
[CONTRIBUTING.md](CONTRIBUTING.md#adding-or-changing-a-check) for what a
check-changing PR needs to include.
