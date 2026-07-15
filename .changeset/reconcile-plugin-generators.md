---
"harness-score": patch
---

Reconcile the two plugin generators that collided when #18 and #13 merged: registry-derived path hints now live in the generated `plugins/shared/tool-paths.mjs`, the hand-maintained `plugins/shared/tools.mjs` imports its paths from it, and `npm run plugins:sync-check` (previously shadowed by a duplicate script key) runs both sync gates.
