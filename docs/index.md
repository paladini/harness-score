---
layout: home

hero:
  name: Harness Score
  text: Harness engineering for Cursor repositories
  tagline: Learn to build the guides, sensors, and guardrails that make AI-assisted development reliable — then measure your repository's maturity with one deterministic command.
  actions:
    - theme: brand
      text: Read the Guide
      link: /guide/what-is-harness-engineering
    - theme: alt
      text: Scan your repo
      link: /guide/measure-and-improve
    - theme: alt
      text: GitHub
      link: https://github.com/paladini/harness-score

features:
  - icon: 🧭
    title: Guides — steer before the agent acts
    details: AGENTS.md, scoped Cursor rules, skills, and commands that put the right context in front of the model at the right time.
  - icon: 📡
    title: Sensors — verify after the agent acts
    details: Tests, linters, type checkers, CI, and Cursor hooks that catch mistakes automatically and let the agent self-correct.
  - icon: 🛡️
    title: Guardrails — make failure impossible
    details: Gate hooks on shell and MCP execution, secret hygiene, and safe defaults that hold even when everything else fails.
  - icon: 📏
    title: A maturity model you can measure
    details: Five levels, six dimensions, thirty-three deterministic checks. `npx harness-score` — no LLM calls, no network, no telemetry.
  - icon: 🏷️
    title: Badges you can show off
    details: Three branded SVGs — live pill (`harness` · `L4`), compact pill per level, and share cards with full names. Wire the scanner into CI once; your README badge updates itself. Free, no shields.io.
---

## One command, zero AI

```bash
npx harness-score
```

The scanner reads your filesystem, applies the same rubric documented in the
[Maturity Model](/guide/maturity-model), and tells you exactly what to improve —
every finding links back to a remediation recipe in this guide. It never calls
a model, so results are reproducible in CI, in pre-commit, or inside Cursor via
the **Harness Score** plugin.

## Branded visuals

Three self-contained SVG artifacts — same shields.io height (20px), level-only
pills for README rows, full names on share cards:

<div class="hs-badge-row">
  <img class="hs-badge" alt="Live badge (auto-updates)" src="/harness-badge.svg" height="20">
  <img class="hs-badge" alt="L0 compact" src="/maturity/badge-l0.svg" height="20">
  <img class="hs-badge" alt="L1 compact" src="/maturity/badge-l1.svg" height="20">
  <img class="hs-badge" alt="L2 compact" src="/maturity/badge-l2.svg" height="20">
  <img class="hs-badge" alt="L3 compact" src="/maturity/badge-l3.svg" height="20">
  <img class="hs-badge" alt="L4 compact" src="/maturity/badge-l4.svg" height="20">
</div>

<p>
  <img alt="L4 share card (includes level name)" src="/maturity/card-l4.svg" width="100%">
</p>

Gallery, CI recipes, and embed snippets:
**[Show your maturity →](/guide/measure-and-improve#show-your-maturity)**
