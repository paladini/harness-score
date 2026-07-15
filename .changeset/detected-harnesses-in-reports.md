---
"harness-score": minor
---

Surface detected harnesses in the human-readable reports. The terminal report
gains a `Detected: Cursor, Claude Code` line under the maturity header and the
markdown report gains a `**Detected harnesses:**` line — the same list `--json`
has exposed as `detectedHarnesses` since v0.4.0, now visible without parsing
JSON. New public exports: `TOOL_DISPLAY_NAMES` and `toolDisplayName()` from the
harness registry. Reports with an empty list (no tool configured) render
exactly as before.
