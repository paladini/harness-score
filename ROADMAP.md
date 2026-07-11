# Roadmap

Harness Score is pre-1.0 and the rubric is expected to keep evolving as we
test it against real repositories. This document tracks what's already
planned so contributors (and future sessions) don't duplicate discovery
work. It is not a promise of dates — just of intent and design direction.

For the invariants any rubric change must respect, see
[AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md#the-three-invariants-that-matter-most).

## Why the rubric still moves

`v0.1.2` was a real-world test against
[tech-leads-club/fakeflix](https://github.com/tech-leads-club/fakeflix), a
genuinely excellent AI-harness example repo. That test fixed several parser
bugs (frontmatter block scalars, hook tokenization, monorepo test-runner
detection, symlink traversal) but also surfaced two things the rubric
**doesn't reward at all today**, even though fakeflix uses them heavily and
our own guide already documents them as core Cursor harness artifacts. Both
are planned for `v0.2.0`.

## Planned for v0.2.0

### 1. Custom subagent definitions (`.cursor/agents/*.md`)

**Problem:** fakeflix defines multiple purpose-built subagents (e.g. a
`bench-planner.md`) under `.cursor/agents/`. [`cursor-harness-surface.md`](docs/guide/cursor-harness-surface.md)
already lists subagents as a core Cursor artifact alongside rules, skills,
and hooks — but no check looks for them, so a repository using them
thoughtfully scores no differently than one that doesn't.

**Direction:**
- New check(s) in `packages/cli/src/checks/skills.ts` (or a new
  `agents.ts` if it grows past one check) detecting `.cursor/agents/*.md`,
  probably mirroring the SKL-01/SKL-02 pattern: existence, then frontmatter
  quality (name/description, since that's how the parent agent decides
  whether to delegate).
- Open question: does this live inside the existing **Skills & Commands**
  dimension (subagents are procedural knowledge, same family as skills), or
  does it need its own dimension? Leaning toward folding into Skills &
  Commands to avoid a 7th dimension and re-deriving all level thresholds —
  but the points budget for that dimension (12 today) needs to grow or be
  redistributed.

### 2. Positive MCP configuration check

**Problem:** [`HYG-04`](docs/guide/measure-and-improve.md#hyg-04) only
checks `.cursor/mcp.json` *negatively* — no credentials leaked. A repository
with a well-configured MCP server (using `${ENV_VAR}` interpolation
correctly) gets exactly the same credit as one with no MCP setup at all.
There's no positive signal for "this repo extended its agent's tool access
deliberately and safely."

**Direction:**
- A new check (working name `HYG-08` or a new `CTX-09`/dimension slot —
  MCP config is arguably closer to Context & Guides than Hygiene) rewarding
  a valid, parseable `.cursor/mcp.json` that *also* uses environment
  interpolation for any field that looks credential-shaped, rather than just
  the absence of a leak.
- Must not double-count with HYG-04 — likely HYG-04 stays the negative gate
  (leaked secret = hard fail) and the new check is the positive complement
  (well-formed and safe = bonus).

## Why these aren't quick adds

Both features add a **positively-weighted check**, which shifts the
earned/max ratio for every dimension total and therefore every existing
fixture under `fixtures/level-0..4/`. Implementing either one correctly
means, in the same PR:

1. Decide the point value and which dimension absorbs it (or whether points
   are redistributed from elsewhere to keep the 100-point total exact).
2. Update `packages/cli/src/score.ts` dimension totals if points move.
3. Update `docs/guide/maturity-model.md` (dimension point table) and
   `docs/guide/measure-and-improve.md` (check catalog) — the docs-sync test
   enforces these match `score.ts` exactly.
4. Update every fixture under `fixtures/level-0..4/` so each still
   represents its intended level after the new check is scored — a fixture
   that silently drops a level because of an unrelated new check is a
   regression in the test suite's meaning, not just its numbers.
5. Decide whether this repository itself needs example artifacts (an actual
   `.cursor/agents/*.md`) to keep dogfooding **L4** on `npm run scan` — right
   now this repo has none, so adding check #1 without an example would drop
   our own Skills & Commands percentage.

None of that is hard, but it's a deliberate design session, not a drive-by
fix — which is why both shipped as documented gaps in `v0.1.2` instead of
rushed changes.

## Also under consideration (not yet scheduled)

- Recognizing more linters/test runners/type checkers as the ecosystem
  detector (`detectEcosystems`) sees them in the wild — this is the kind of
  contribution that needs no design discussion, just a PR (see
  [CONTRIBUTING.md](CONTRIBUTING.md)).
- A `--diff` or `--since` mode comparing two scans, so CI can report
  "harness score moved from L2 to L3 in this PR" instead of just a snapshot.
- Expanding beyond Cursor-specific artifacts to recognize equivalent
  constructs in other agent harnesses (e.g. Claude Code's own
  `.claude/agents/`, hooks, and skills) without diluting the Cursor-first
  focus of the guide.

## Proposing something new

Open an issue using the **feature request / new check** template. See
[CONTRIBUTING.md](CONTRIBUTING.md#adding-or-changing-a-check) for what a
rubric-changing PR needs to include.
