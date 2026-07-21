# harness-score

## 1.3.0

### Minor Changes

- 64bee8d: Add harness scope configuration (`.harness-score.json`, `--scope`, `--gate`) with dual maturity/effective scores and global user-level overlay scanning.

## 1.2.0

### Minor Changes

- aa4b498: Add Hindi (`hi-IN`) documentation locale with full guide translation and VitePress i18n wiring. Includes previously unreleased zh-CN docs locale from the same release train.

## 1.1.0

### Minor Changes

- Fix `HKS-05` (hook scripts exist in the repository) to resolve both Claude Code interpolation forms for hook command paths:
  - **Unbraced `$VAR/...` form:** `hookCommandPathsResolve` only stripped the braced `${VAR}/...` prefix before checking whether a hook command references a committed file. The unbraced form (`$CLAUDE_PROJECT_DIR/.claude/hooks/setup.sh`) is equally valid Claude Code syntax and was reported as a missing script even when the file exists and is committed — a false negative costing 2 points.
  - **`node_modules/.bin/` binaries:** a hook command referencing a package-manager-installed binary (e.g. `${CLAUDE_PROJECT_DIR}/node_modules/.bin/block-no-verify`) is now treated as resolved. These are populated by `npm install`, not scripts a repository is expected to commit — the previous "commit the script" remediation didn't apply to them.
- Add full VitePress guide translations in English (default), Portuguese (Brazil), and Latin American Spanish, with translated landing pages and language switcher on home and guide.

## 1.0.0

### Major Changes

- **Harness Score 1.0.0** — first stable major release.

  Harness Score is now a general-purpose harness-maturity platform, not a
  Cursor-specific tool: one scan scores the harness a repository builds for
  Cursor, Claude Code, Windsurf, Cline, Continue, Codex, and other AI coding
  tools, with OR semantics across equivalent artifacts.

  With 1.0, the public surface is stable under semantic versioning:

  - Check IDs (`CTX-01` … `HYG-08`) are stable identifiers.
  - The `Report` JSON shape (`--json` and the typed programmatic API) only
    gains fields in minors; removals/renames are major.
  - CLI flags and exit codes (`0` pass, `1` gate failure, `2` usage error)
    are stable.
  - Maturity-model evolution (new checks, point totals, thresholds) ships in
    minor versions and is flagged by `--diff`'s `maturityModelChanged`.
  - The determinism invariants — zero LLM calls, zero network access, zero
    runtime dependencies, same input ⇒ same output — are permanent.

  No breaking changes relative to v0.6.0: scores, output shapes, and flags are
  identical. The major bump marks API stability, not disruption.

## 0.6.0

### Minor Changes

- 0e35129: Surface detected harnesses in the human-readable reports. The terminal report
  gains a `Detected: Cursor, Claude Code` line under the maturity header and the
  markdown report gains a `**Detected harnesses:**` line — the same list `--json`
  has exposed as `detectedHarnesses` since v0.4.0, now visible without parsing
  JSON. New public exports: `TOOL_DISPLAY_NAMES` and `toolDisplayName()` from the
  harness registry. Reports with an empty list (no tool configured) render
  exactly as before.

## 0.5.0

### Minor Changes

- 5f55685: Fix three multi-harness equivalence gaps found by field-testing v0.4.0 against a corpus of differently-shaped repositories:

  - **Hooks (regression fix):** a hook-less `.claude/settings.json` (e.g. permissions only) no longer shadows a fully-configured `.cursor/hooks.json` — of all parseable hooks configs, the one with the most registered events now wins, so adopting a second tool can never lower HKS-02…05.
  - **CTX-04:** `.continue/rules/*.md` without frontmatter now pass at the repository root too (the path check previously only matched in subdirectories).
  - **CTX-03/04/05 (scoring change, minor):** nested context files (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md` in subdirectories) now count as scoped rules — they are the directory-scoped rules mechanism of Claude Code, Codex, and Gemini. A fully-harnessed Claude Code repository can now progress past L1 without any `.cursor/` paths.

## 0.4.0

### Minor Changes

- 6c7a64b: Migrate the build to tsup (smaller, bundled `dist/`, an explicit `"types"` field and `"types"` export condition), memoize `ctx.matching()` for a measurable scan-time win on large repositories, and add packaging-level type/exports verification (`attw`, a consumer-facing type smoke test) to CI. No public API or output changes — verified against a golden-output regression snapshot and an external-consumer `npm pack` smoke test.
- f3ad4b6: Rename public terminology from "rubric" to **maturity model** (aligned with DORA/SAMM/CMMI framing). Breaking API rename: `ReportDiff.rubricChanged` → `maturityModelChanged`. Issue template `rubric_change.yml` → `check_change.yml`; test `rubric-sync.test.ts` → `maturity-sync.test.ts`.
- b879862: Recognize equivalent AI harness artifacts across Cursor, Windsurf, Claude Code, Codex/Antigravity, OpenCode, Cline, Continue, Copilot instructions, and Zed using OR semantics — a single configured tool is enough to satisfy existing checks without requiring `.cursor/` paths.

### Patch Changes

- f3ad4b6: Reconcile the two plugin generators that collided when #18 and #13 merged: registry-derived path hints now live in the generated `plugins/shared/tool-paths.mjs`, the hand-maintained `plugins/shared/tools.mjs` imports its paths from it, and `npm run plugins:sync-check` (previously shadowed by a duplicate script key) runs both sync gates.
