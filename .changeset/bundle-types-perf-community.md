---
"harness-score": minor
---

Migrate the build to tsup (smaller, bundled `dist/`, an explicit `"types"` field and `"types"` export condition), memoize `ctx.matching()` for a measurable scan-time win on large repositories, and add packaging-level type/exports verification (`attw`, a consumer-facing type smoke test) to CI. No public API or output changes — verified against a golden-output regression snapshot and an external-consumer `npm pack` smoke test.
