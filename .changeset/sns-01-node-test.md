---
'harness-score': patch
---

Recognize Node's built-in test runner (`node:test`) as a configured test runner for SNS-01, including repositories with no package.json. When test files exist without a runner, SNS-01 names them instead of claiming that no runner was found.

Thanks to [@lglucas](https://github.com/lglucas) for reporting this.
