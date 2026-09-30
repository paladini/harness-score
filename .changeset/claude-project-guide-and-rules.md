---
'harness-score': patch
---

Treat Claude Code `.claude/CLAUDE.md` and `.claude/AGENTS.md` as project guides (CTX-01/02) instead of scoped rules, and recognize `.claude/rules/**/*.md` for CTX-03..06 with optional `paths` frontmatter.

**Score impact:** Repositories whose only rule-like file was `.claude/CLAUDE.md` or `.claude/AGENTS.md` lose 11 context points and can drop from L4 to L1; guide credit remains via CTX-01. Repos with `.claude/rules/` or nested context files in code directories keep or gain rule points.

Thanks to [@paladini](https://github.com/paladini) for reporting this in [#80](https://github.com/paladini/harness-score/issues/80).
