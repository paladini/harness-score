# The Maturity Model

This chapter defines the maturity model — the same assessment framework
implemented by [`npx harness-score`](/guide/measure-and-improve),
so a level you read here is a level you can measure, reproduce, and gate on.

The shape follows familiar capability-maturity patterns (DORA *capabilities*,
OWASP SAMM *business functions*, CMMI *levels*): **dimensions** measure
areas of practice, **checks** are deterministic pass/fail indicators, and
**levels** gate on coverage shape — not just a raw percentage.

Design goals:

- **Deterministic.** Every check is a filesystem fact: a file exists, parses,
  matches a pattern. No model, no judgment calls, no network.
- **Harness-agnostic, Cursor as flagship example.** Rules, skills, hooks, and
  commands from any supported AI-first tool (Cursor, Windsurf, Claude Code,
  Codex/Antigravity `.agents/`, OpenCode, Cline, Continue, Copilot
  instructions, Zed) score via OR semantics — one configured tool is enough.
  Universal harness infrastructure (tests, linters, types, CI) forms the same
  control system regardless of IDE.
- **A ladder, not a grade.** Levels gate on the *shape* of your harness (which
  dimensions are covered), not just a raw percentage — 80 points of guides
  with zero sensors is not maturity.

## The six dimensions

108 points across six dimensions:

| Dimension | Points | What it measures |
|---|---|---|
| Context & Guides | 20 | AGENTS.md, rules quality and scoping |
| Skills & Commands | 17 | Procedural knowledge, explicit workflows, subagents |
| Hooks & Guardrails | 14 | Runtime-enforced gates and feedback |
| Sensors & Feedback | 20 | Tests, linter, types, formatter |
| CI Feedback | 14 | Pipeline checks, pre-commit |
| Hygiene & Safety | 23 | Secrets, env files, lockfile, license, MCP config |

Each dimension is the sum of individual checks (full catalog with
remediations in [chapter 7](/guide/measure-and-improve#the-check-catalog)).

## The five levels

### L0 · Unharnessed

The repository gives an agent nothing: no context file, no rules, no
enforced checks. Agents work here — they always do — but every session
rediscovers the project from scratch and every mistake ships unless a human
catches it. Most repositories start here.

### L1 · Documented

**Requires: Context & Guides ≥ 40%.**

There is a substantive `AGENTS.md` (or equivalent): what the project is, how
to build and test it, what the conventions are. The single highest-leverage
step from zero — feedforward for every future session in one file.

### L2 · Guided

**Requires: Context ≥ 60% · (Skills ≥ 30% or Hooks ≥ 30%) · Hygiene ≥ 50%.**

Guidance has structure: scoped rules with valid frontmatter (`.cursor/rules/`,
`.windsurf/rules/`, `.clinerules/`, or your tool's equivalent), and at least
the beginnings of procedural knowledge (a skill, command/workflow, or
subagent) or hook machinery. Basic hygiene holds — env files ignored, no
credential signatures in harness files. The harness now ships with the code
and is reviewed like code.

### L3 · Sensing

**Requires L2, plus: Sensors ≥ 60% · CI ≥ 50%.**

The feedback loop exists. Tests the agent can run, a linter, type checking,
and a CI pipeline that re-verifies every push. This is the level where
self-correction starts: the agent can *check its own work* with deterministic
tools, and the pipeline catches what it misses. For most teams, L3 is where
AI-assisted development stops feeling risky.

### L4 · Self-correcting

**Requires L3, plus: Hooks ≥ 70% · total score ≥ 80%.**

The loop closes at runtime. Gate hooks make destructive actions impossible
rather than discouraged; feedback hooks lint and format on every edit, inside
the session. Guides, sensors, and guardrails cover all six dimensions. A
mistake now has to get past the rules, the on-edit hooks, the tests, the
type checker, CI, *and* the gates — mostly without any human in the loop.

## Reading a score

Two repositories can both score 65% with very different shapes — that's why
levels gate on dimensions:

- **65%, all guides, no sensors** → L1. Beautifully documented, unverified.
  Priority: tests + CI, not more prose.
- **65%, strong sensors, no context** → L0/L1. The agent's work is checked
  but it guesses your conventions every session. Priority: one afternoon on
  `AGENTS.md` and three scoped rules.

The scanner prints exactly which requirement blocks the next level
(`To reach L3: sensors ≥ 60%; ci ≥ 50%`), so the improvement path is never
ambiguous.

## What the model deliberately does not measure

Honesty about the limits of determinism (Fowler's "behavior harness is
immature" caveat applies to measurement too):

- **Whether your tests are good** — only that they exist, run, and gate.
- **Whether your rules are true** — a stale rule scores like a fresh one.
- **Functional correctness** — no static scan can verify behavior.
- **Team practice** — branch protection, review culture, and agent workflows
  live outside the repository tree.

A high score means the *infrastructure* for reliable agent work exists. It
is necessary, not sufficient — the ceiling on what a deterministic scanner
can honestly claim.

## Using the ladder

1. Run `npx harness-score` — get your level and the exact gaps.
2. Climb one level at a time; each level's requirements are one focused
   effort (L1: write AGENTS.md → L2: rules + hygiene → L3: sensors + CI →
   L4: hooks).
3. Gate the level in CI (`--min-level`) so maturity only ratchets up.
4. Show it off — a README badge (`harness` · `L4`) and optional
   [share card](/guide/measure-and-improve#show-your-maturity). Same pill from
   CI (`--badge`) or a pinned static file.

Chapter 7 walks each step, check by check.
