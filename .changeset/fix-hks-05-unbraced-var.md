---
"harness-score": minor
---

Fix `HKS-05` (hook scripts exist in the repository) to resolve both Claude Code interpolation forms for hook command paths:

- **Unbraced `$VAR/...` form:** `hookCommandPathsResolve` only stripped the braced `${VAR}/...` prefix before checking whether a hook command references a committed file. The unbraced form (`$CLAUDE_PROJECT_DIR/.claude/hooks/setup.sh`) is equally valid Claude Code syntax and was reported as a missing script even when the file exists and is committed — a false negative costing 2 points.
- **`node_modules/.bin/` binaries:** a hook command referencing a package-manager-installed binary (e.g. `${CLAUDE_PROJECT_DIR}/node_modules/.bin/block-no-verify`) is now treated as resolved. These are populated by `npm install`, not scripts a repository is expected to commit — the previous "commit the script" remediation didn't apply to them.

Found via [harness-maturity-analysis](https://github.com/paladini/harness-maturity-analysis)'s corpus study, corroborated independently in `cline` (unbraced `$VAR`) and `promptfoo` (`node_modules/.bin/`).
