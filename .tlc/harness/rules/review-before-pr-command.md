---
on: command(gh pr create)
require:
  - subagent(harness-reviewer) since HEAD
otherwise: deny
---

Run harness-reviewer on the final clean commit after full verification. Resolve
findings, commit corrections, verify again, and request a new review. This rule
records review execution; it does not authorize opening or merging a PR.
