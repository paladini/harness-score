---
"harness-score": minor
---

Fix three multi-harness equivalence gaps found by field-testing v0.4.0 against a corpus of differently-shaped repositories:

- **Hooks (regression fix):** a hook-less `.claude/settings.json` (e.g. permissions only) no longer shadows a fully-configured `.cursor/hooks.json` — of all parseable hooks configs, the one with the most registered events now wins, so adopting a second tool can never lower HKS-02…05.
- **CTX-04:** `.continue/rules/*.md` without frontmatter now pass at the repository root too (the path check previously only matched in subdirectories).
- **CTX-03/04/05 (scoring change, minor):** nested context files (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md` in subdirectories) now count as scoped rules — they are the directory-scoped rules mechanism of Claude Code, Codex, and Gemini. A fully-harnessed Claude Code repository can now progress past L1 without any `.cursor/` paths.
