---
description: HTTP handler conventions
paths: ["src/app.js"]
---

- Every route handler must validate inputs before use.
- Return JSON errors as `{ "error": string }` with an appropriate status code.
