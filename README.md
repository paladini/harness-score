<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/harness-score-logo-dark.svg">
    <img alt="Harness Score" src="brand/harness-score-logo.svg" width="440">
  </picture>
</p>

<h1 align="center">Harness Score</h1>

<p align="center">
  <b>Your AI coding agent is only as reliable as the harness around it.</b><br>
  Measure that harness in seconds. Know exactly what to fix. Watch the number go up.
</p>

<p align="center">
  <a href="https://github.com/paladini/harness-score/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/paladini/harness-score/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://paladini.github.io/harness-score/"><img alt="Harness Score" src="https://raw.githubusercontent.com/paladini/harness-score/main/docs/public/harness-badge.svg" height="20"></a>
  <a href="https://www.npmjs.com/package/harness-score"><img alt="npm" src="https://img.shields.io/npm/v/harness-score"></a>
  <a href="https://jsr.io/@paladini/harness-score"><img alt="JSR" src="https://jsr.io/badges/@paladini/harness-score"></a>
  <a href="https://paladini.github.io/harness-score/"><img alt="docs" src="https://img.shields.io/badge/guide-github%20pages-blue"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

An AI coding agent is a model plus a **harness** — the context files, rules,
skills, hooks, sensors, and guardrails wrapped around it. The model you rent;
the harness you own. Two repositories can use the exact same model and get
wildly different results, because one has a harness that catches mistakes
before they ship and the other has none.

**Harness Score measures that harness.** Point it at any repository and get a
maturity level (L0–L4), a 108-point breakdown across six dimensions, and the
precise, ranked list of what to fix next — with zero LLM calls, zero network
access, and the same result every time you run it.

```bash
npx harness-score
```

```
  harness-score v0.3.0  ~/my-app

  Maturity: L2 · Guided   Score: 70/108 (65%)

  Context & Guides     ████████████████░░░░  80%  16/20 pts
  Skills & Commands    █████████████░░░░░░░  65%  11/17 pts
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%   0/14 pts
  Sensors & Feedback   ████████████████░░░░  80%  16/20 pts
  CI Feedback          ██████████████░░░░░░  71%  10/14 pts
  Hygiene & Safety     ███████████████░░░░░  74%  17/23 pts

  To reach L3: sensors ≥ 60%; ci ≥ 50%
```

Not just a score — a **diagnosis**. Every failed check names the file,
explains what's missing, and links to the exact recipe to fix it. Every
check is a filesystem fact — a file exists, parses, matches a pattern —
never a judgment call and never a network request. Same repository, same
commit, same score, on your laptop or in CI, forever. That's what lets you
gate a pipeline on it.

---

## Why this exists

Vibe-coding without a harness works, right up until it doesn't: an agent that
rediscovers your conventions every session, `rm -rf`s something it shouldn't,
or ships code nobody reviewed because nothing was there to catch it. The
fix isn't "prompt better" — it's building the same kind of control system
around an AI agent that you'd build around any other autonomous system:
**guides** to steer it, **sensors** to check its work, and **guardrails** to
stop it before damage happens.

Most repositories have none of this and don't know it. Harness Score tells
you exactly where you stand, in a language a CI pipeline (and a competitive
teammate) understands: a number, a level, a badge.

## The maturity ladder

Levels don't just add up points — they gate on the **shape** of your harness.
80 points of beautifully written docs with zero tests is not maturity; it's
L1. Climbing the ladder means covering a new dimension at each step.

| | Level | What it means | Priority to climb |
|---|---|---|---|
| 🌱 | **L0 · Unharnessed** | Agents rediscover the project every session. Mistakes ship unless a human happens to catch them. Most repositories start — and stay — here. | Write an `AGENTS.md` |
| 📖 | **L1 · Documented** | A substantive `AGENTS.md` orients every session: what the project is, how to build and test it, what not to touch. The single highest-leverage step from zero. | Add scoped rules + a skill |
| 🧭 | **L2 · Guided** | Guidance has real structure: scoped `.cursor/rules/`, at least one skill or command, basic hygiene (env files ignored, no leaked secrets). The harness ships with the code and is reviewed like code. | Add a test runner, linter, types, CI |
| 🔬 | **L3 · Sensing** | The feedback loop exists. Tests, a linter, type checking, and a CI pipeline re-verify every push. The agent can check its own work with deterministic tools — this is where AI-assisted development stops feeling risky. | Add gate + feedback hooks, pre-commit |
| 🛡️ | **L4 · Self-correcting** | The loop closes at runtime. Gate hooks make destructive actions *impossible*, not just discouraged; feedback hooks lint and format inline. A mistake has to get past rules, hooks, tests, types, CI, *and* the gates — mostly without a human in the loop. | Keep it there — gate CI on `--min-level 4` |

The scanner always tells you exactly which requirement blocks the *next*
level (`To reach L3: sensors ≥ 60%; ci ≥ 50%`) — the path up is never a
guess. Full rubric, thresholds, and rationale:
**[the Maturity Model](https://paladini.github.io/harness-score/guide/maturity-model)**.

## The six dimensions

108 points, six dimensions, 36 checks — each one naming a concrete artifact,
never "write better rules."

| Dimension | Points | What it measures |
|---|---|---|
| 📖 Context & Guides | 20 | `AGENTS.md` substance, `.cursor/rules/` scoping and frontmatter |
| 🧩 Skills & Commands | 17 | Packaged procedures — skills, slash commands, subagents, trigger-worthy descriptions |
| 🪝 Hooks & Guardrails | 14 | Gate hooks (block risky actions) and feedback hooks (lint/format on edit) |
| ✅ Sensors & Feedback | 20 | Test runner, linter, type checker, formatter, actual test files |
| ⚙️ CI Feedback | 14 | Pipeline runs tests/lint/types on every push, pre-commit installed |
| 🔒 Hygiene & Safety | 23 | `.gitignore`, no leaked `.env`/secrets, license, lockfile, safe MCP config |

Full check catalog, with every remediation recipe:
**[Measure & Improve](https://paladini.github.io/harness-score/guide/measure-and-improve#the-check-catalog)**.

## What it deliberately does not measure

Honesty about the limits of a deterministic scanner:

- **Whether your tests are good** — only that they exist, run, and gate.
- **Whether your rules are true** — a stale rule scores like a fresh one.
- **Functional correctness** — no static scan can verify behavior.
- **Team practice** — branch protection and review culture live outside the tree.

A high score means the *infrastructure* for reliable agent work exists. It's
necessary, not sufficient — and that's the honest ceiling of what any
deterministic scanner can claim.

## The four pieces

| Piece | What | Where |
|---|---|---|
| 📖 **The Guide** | Harness engineering applied to Cursor: guides (feedforward), sensors (feedback), guardrails, and the 5-level maturity model. Consolidates Martin Fowler's harness engineering articles, LangChain's harness lessons, and Cursor's own docs. | [paladini.github.io/harness-score](https://paladini.github.io/harness-score/) |
| 🔍 **The CLI** | `npx harness-score` — 36 checks across 6 dimensions, maturity level L0–L4, JSON/markdown/badge output, `--diff` mode, `--min-level` CI gate. Zero runtime dependencies, fully-typed programmatic API. | [packages/cli](packages/cli) |
| 🧩 **The Cursor plugin** | `/harness-audit` command + `harness-engineering` skill: audit the open workspace and let the agent fix the gaps following the guide's recipes. | [plugin](plugin) |
| ⚙️ **The GitHub Action** | Run the scan on every push, gate on a minimum level, emit the badge. | [action](action) |

## Show your maturity in your README

Harness Score ships **two branded SVG formats** — free, self-contained, no
shields.io subscription:

| Format | Shows | Best for |
|---|---|---|
| **Badge** (`harness-badge.svg` or `badge-l0`–`l4`) | `harness` · `L4` | README row (112×20) |
| **Share card** (`card-l0`–`l4`) | Full banner with level name | Social posts, repo hero |

The pill looks the same whether CI regenerates it or you pin a static file.

**Auto-updating badge (recommended)** — CI writes `harness-badge.svg` on every run:

```yaml
# .github/workflows/harness.yml
- uses: paladini/harness-score/action@main
  with: { badge: 'harness-badge.svg' }
# publish harness-badge.svg to a badges branch or GitHub Pages, then:
```

```md
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

**Pinned badge** — same pill, static `badge-lN.svg`:

```md
<img alt="Harness Score L3" src="https://paladini.github.io/harness-score/maturity/badge-l3.svg" height="20">
```

All five badge levels:

<p align="center">
  <img alt="L0" src="https://paladini.github.io/harness-score/maturity/badge-l0.svg" height="20">
  <img alt="L1" src="https://paladini.github.io/harness-score/maturity/badge-l1.svg" height="20">
  <img alt="L2" src="https://paladini.github.io/harness-score/maturity/badge-l2.svg" height="20">
  <img alt="L3" src="https://paladini.github.io/harness-score/maturity/badge-l3.svg" height="20">
  <img alt="L4" src="https://paladini.github.io/harness-score/maturity/badge-l4.svg" height="20">
</p>

Shareable banner cards for posts and docs (`card-l0`–`card-l4`):

<p align="center">
  <a href="https://paladini.github.io/harness-score/guide/measure-and-improve#show-your-maturity">
    <img alt="L4 · Self-correcting" src="https://paladini.github.io/harness-score/maturity/card-l4.svg" width="480">
  </a>
</p>

Full gallery, CI recipes, and copy-paste embeds (Markdown, HTML, iframe, JSX):
**[Show your maturity →](https://paladini.github.io/harness-score/guide/measure-and-improve#show-your-maturity)** ·
**[Embed snippets →](https://paladini.github.io/harness-score/guide/measure-and-improve#embed-snippets)**

## Install

No install needed — just run it:

```bash
npx harness-score
```

Or install it, for repeated / offline / CI use:

```bash
npm install -g harness-score        # global binary
npm install --save-dev harness-score # pinned in a repo's devDependencies
```

Mirrored on other registries, in case npm is unreachable or you prefer a
different ecosystem:

| Registry | Package | Install |
|---|---|---|
| **npm** | [`harness-score`](https://www.npmjs.com/package/harness-score) | `npm install -g harness-score` |
| **GitHub Packages** | [`@paladini/harness-score`](https://github.com/paladini/harness-score/pkgs/npm/harness-score) | `npm install -g @paladini/harness-score --registry=https://npm.pkg.github.com` |
| **JSR** (Deno/Bun) | [`@paladini/harness-score`](https://jsr.io/@paladini/harness-score) | `deno run npm:harness-score` or `npx jsr add @paladini/harness-score` |

## Quick start

```bash
# score a repository
harness-score            # or: npx harness-score

# machine-readable / markdown / badge
harness-score --json
harness-score --md report.md
harness-score --badge harness-badge.svg

# gate CI: fail below L3
harness-score --min-level 3
```

Or in CI:

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
```

## A worked improvement plan

Starting from a typical L0 product repo, one focused session per level:

1. **→ L1 (an afternoon).** Write `AGENTS.md`: what the project is, how to
   build/test it, what conventions hold. Include commands even if your
   sensors are weak — the agent will use them.
2. **→ L2 (a day).** Three scoped `.cursor/rules/*.mdc` + one skill for your
   most repeated procedure. Fix hygiene: gitignore, env files, license.
3. **→ L3 (the real work, if sensors are missing).** Test runner + linter +
   strict types + a CI workflow that runs all three. If you already have
   them, this level is free.
4. **→ L4 (a morning).** One gate hook + one feedback hook, committed with
   their scripts, plus pre-commit — then `--min-level 4` in CI so it never
   regresses.

Full recipes for every step: **[the guide](https://paladini.github.io/harness-score/)**.

## This repo dogfoods itself

The repository you are reading maintains **L4 · Self-correcting** on its own
scanner (`npm run scan`), and CI fails if it ever regresses. Its `AGENTS.md`,
`.cursor/rules/`, skills, commands, and hooks are live examples of everything
the guide teaches.

## Development

```bash
npm install
npm test            # build + vitest (fixtures pin each maturity level)
npm run lint        # biome
npm run scan        # self-audit — must print L4
npm run docs:dev    # guide dev server
npm run bench -w harness-score   # scan-time benchmark against a synthetic large repo
```

Monorepo layout, conventions, and the rubric-sync rule live in
[AGENTS.md](AGENTS.md) — written for agents, useful for humans.

## Contributing

Issues and pull requests are welcome — new checks, new language/tool
recognition (a linter or test runner the scanner doesn't know about yet),
docs fixes, bug reports against real-world repositories. Proposing a new
check or a rubric change? Use the
**[Rubric change](https://github.com/paladini/harness-score/issues/new?template=rubric_change.yml)**
issue template — it's the highest-value contribution and the one most
likely to need agreement up front, since it changes what every existing
repository scores. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full
workflow and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for how we expect
people to treat each other. Security issues: see [SECURITY.md](SECURITY.md)
instead of filing a public issue.

## Roadmap

What's already planned for the next version lives in
[ROADMAP.md](ROADMAP.md), including two checks identified during real-world
testing that the rubric doesn't yet reward: custom subagent definitions and
a positive check for a properly configured `.cursor/mcp.json`.

## License

[MIT](LICENSE) © 2026 Fernando Paladini
