---
"harness-score": minor
---

Rename public terminology from "rubric" to **maturity model** (aligned with DORA/SAMM/CMMI framing). Breaking API rename: `ReportDiff.rubricChanged` → `maturityModelChanged`. Issue template `rubric_change.yml` → `check_change.yml`; test `rubric-sync.test.ts` → `maturity-sync.test.ts`.
