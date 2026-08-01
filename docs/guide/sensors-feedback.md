# Sensors — Feedback Controls

Sensors verify what the agent did. They close the loop that makes
self-correction possible: an agent with good sensors fixes its own mistakes
before you ever see them; an agent without sensors ships them with a
confident summary.

## The sensor stack

Order by speed and cost, fastest first — this ordering *is* the "keep quality
left" principle:

| Sensor | Latency | Runs at |
|---|---|---|
| Type checker | ms–s | On edit (hook), pre-commit, CI |
| Linter / formatter | ms–s | On edit (hook), pre-commit, CI |
| Unit tests | s | Agent-invoked, pre-commit, CI |
| Integration/E2E tests | min | CI |
| Architecture fitness checks | s–min | CI |
| AI code review (inferential) | min, $ | PR |
| Human review | hours | PR |

The goal is not to run everything everywhere; it's that each mistake is
caught by the **cheapest sensor able to detect it**, as **early** as
possible. Reserve the two expensive rows for what nothing above them can see.

## Type checking: the free sensor

A strict type checker is the highest-value sensor for agent work because it
runs on every edit at zero marginal cost, is fully deterministic, and its
error messages are precise enough for an agent to act on autonomously.

- TypeScript: `"strict": true` — non-strict TS silently forfeits most of the
  value.
- Python: mypy or pyright, in CI, not just in the IDE.
- Go, Rust, Java, C#: the compiler already does this; make sure the agent
  builds before it declares done.

This is also an argument in language strategy: typed codebases are
measurably more *harnessable* — the compiler supervises every agent edit for
free.

## Tests: the sensor agents use to self-correct

For an agent, a test suite is not (only) a safety net — it's the tool it uses
to verify its own work mid-task. That changes what "good tests" means:

1. **Fast.** A suite the agent can run in seconds gets run after every
   change; a 20-minute suite gets run never. Keep a fast subset (`npm test`)
   even if the full suite is slower.
2. **Runnable with one obvious command**, documented in `AGENTS.md`. If tests
   need three env vars and a database, script the setup.
3. **Deterministic.** Flaky tests teach agents (like humans) to ignore red.
4. **Behavioral.** Tests that pin implementation details block legitimate
   refactors; tests that pin behavior catch real regressions. The
   [approved fixtures](https://lexler.github.io/augmented-coding-patterns/patterns/approved-fixtures/)
   pattern — golden files reviewed by humans, checked by machines — which
   Böckeler notes colleagues use selectively, works well for agent-heavy
   codebases.

And a convention worth putting in a rule: **new behavior lands with a test,
and a failing test is never deleted to go green.** Agents will do both if
allowed.

## Linters: encode conventions as code

Every convention you can express as a lint rule is a convention you delete
from your rules files — the linter enforces it deterministically, with a
better feedback loop than prose. Modern stacks make custom rules cheap
(ESLint flat config, Biome, Ruff, golangci-lint custom linters).

Priority for agent work:

- Rules that catch *semantic* slips (unused vars, floating promises,
  unhandled errors) over pure style.
- Auto-fixable rules — pair with a formatter so diffs stay signal-only.
- Custom rules for your project's recurring "the agent keeps doing X".

## Architecture fitness: sensors for structure

Böckeler's second regulation dimension is architectural fitness — sensors that
verify structure, not just syntax:

- **Dependency rules**: "core never imports from api" — ArchUnit (JVM),
  dependency-cruiser (JS/TS), import-linter (Python).
- **Module boundaries** in monorepos: Nx/Turborepo boundary checks.
- **Performance budgets**: bundle size limits, query counts, p95 assertions.

These matter *more* with agents than without: an agent optimizing a local
task will happily violate a global constraint no local file mentions. Fitness
checks make the global constraint local and immediate.

## Hooks as on-edit sensors

Cursor hooks move sensors from "when the agent remembers" to "always":

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": "node ./.cursor/hooks/format-on-edit.js", "timeout": 30 }
    ]
  }
}
```

Good `afterFileEdit` citizens: format the file, run the linter on it, run the
type checker on its package — and surface failures back so the agent fixes
them *now*, in-context, rather than at CI time an hour later. Keep them fast
(sub-second where possible); a slow hook taxes every edit.

## CI: the sensor of record

Local sensors are advisory — nothing forces the agent (or the human merging
its work) to have run them. CI is where sensors become **facts**:

- Run tests, lint, and typecheck on every push and PR.
- Make them required checks; an agent-authored PR with red CI is unreviewed
  work, not a draft.
- Add `harness-score --min-level N` as a job to stop harness *regression* —
  the config-drift failure where someone deletes the hooks file and nobody
  notices ([details in chapter 7](/guide/measure-and-improve#ci-gate)).

Pre-commit tooling (husky + lint-staged, `pre-commit`, lefthook) fills the
gap between on-edit hooks and CI: the last deterministic check before a
commit exists.

## Inferential sensors: AI reviewing AI

LLM-based review (Cursor's Bugbot, judge agents, review plugins) earns its
cost on what computation can't check: does this change *mean* the right
thing? Is this abstraction sane? Two rules keep it honest:

1. It supplements the computational stack, never substitutes for it. An AI
   reviewer approving code that doesn't compile is theater.
2. Its findings should be *spot-checkable* — prefer reviewers that cite
   file:line and state a failure scenario over ones that emit vibes.

## The self-correction loop, assembled

With the stack in place, the loop LangChain engineered explicitly emerges
naturally: the agent edits → hooks format and lint → it runs the fast tests →
CI re-verifies everything → an inferential reviewer reads the survivors. Each
layer catches what the previous one missed, and each catch happens at the
cheapest possible point. What's still missing is making dangerous actions
impossible rather than detectable — that's [Guardrails](/guide/guardrails-and-safety).
