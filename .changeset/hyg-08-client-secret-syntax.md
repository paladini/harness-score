---
'harness-score': patch
---

HYG-08 now accepts each MCP client's documented secret syntax, not only `${VAR}`: `${VAR:-default}` (Claude Code), `${env:VAR}` (Cursor, VS Code), `${input:id}` (VS Code), `{env:VAR}` (OpenCode), and `${{ secrets.NAME }}` (Continue). Codex keys such as `bearer_token_env_var` hold a variable name, and VS Code `inputs` only declare prompts, so neither is read as a literal credential anymore.

Thanks to [@JYunth](https://github.com/JYunth) for contributing this change.
