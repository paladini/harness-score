# harness-score

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
