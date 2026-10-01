---
'harness-score': minor
---

HYG-05 is not applicable when a repository has no LICENSE file and the root `composer.json` or `package.json` `license` is `proprietary` or `UNLICENSED`. HYG-08 is not applicable when the repository has no MCP config. Not-applicable checks stay in the report with `checks[].applicable: false` and drop out of the score numerator and denominator. Adopting MCP later, or removing a closed-source license declaration, shows up in `--diff` as an applicability change.

Thanks to [@andersonRogani](https://github.com/andersonRogani) for reporting this.
