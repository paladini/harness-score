---
'harness-score': patch
---

Recognize Astral ty as a Python type checker. SNS-03 accepts `ty.toml` and `[tool.ty]` tables (including nested projects), and CI-03 accepts `ty check` in CI, including `uv run` and `uvx`.

Thanks to [@hiagot](https://github.com/hiagot) for contributing this change.
