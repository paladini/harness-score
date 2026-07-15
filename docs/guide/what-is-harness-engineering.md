# What is Harness Engineering

> An agent is a model plus a harness. The model you rent; the harness you own.

When an AI coding agent works in your repository, only part of its behavior
comes from the model. The rest comes from everything *around* the model: the
instructions it loads, the tools it can call, the checks that run on its
output, the gates that stop it from doing something destructive. That
surrounding machinery is the **harness**, and building it deliberately is
**harness engineering**.

The term crystallized in early 2026. Martin Fowler's site published
[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
(building on an earlier
[memo](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)),
framing the discipline for teams that *use* agents. Around the same time,
LangChain showed the other side of the coin: by improving only the harness of
their coding agent — never touching the model — they moved from **52.8% to
66.5%** on Terminal Bench 2.0, from outside the top 30 to top 5
([Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)).

The core insight from both: **reliability is a property of the whole
model–harness–environment system, not of the model weights**. A well-harnessed
repository makes a mediocre model useful; an unharnessed repository makes a
frontier model dangerous.

## Guides and Sensors

Fowler's framework splits harness controls into two families, borrowed from
control theory:

| | **Guides** (feedforward) | **Sensors** (feedback) |
|---|---|---|
| When | *Before* the agent acts | *After* the agent acts |
| Purpose | Steer toward good outcomes | Detect and correct bad ones |
| Cursor examples | `AGENTS.md`, rules, skills, commands, MCP context | tests, linters, type checkers, CI, hooks |
| Failure mode when missing | Agent guesses your conventions | Agent ships mistakes confidently |

A harness needs both. Guides without sensors produce confident, unverified
output. Sensors without guides catch the same mistakes over and over because
the agent was never told how to avoid them.

## Computational vs. inferential checks

Fowler draws a second distinction that this guide — and the `harness-score`
scanner — takes seriously:

- **Computational checks** are deterministic: linters, type checkers, tests,
  structural analysis. They run in milliseconds to seconds, cost nothing, and
  give the same answer every time. They belong *everywhere*: in hooks, in
  pre-commit, in CI.
- **Inferential checks** use a model: AI code review, LLM-as-judge, semantic
  audits. They are powerful but slow, costly, and probabilistic. Use them
  where semantics matter and computation can't reach.

The strategic principle is **"keep quality left"**: push the fast, cheap,
deterministic checks as early as possible in the loop, and reserve inferential
judgment for what remains. This is also why `harness-score` itself is 100%
computational — a maturity measurement you can't reproduce is not a
measurement.

## What the harness buys you: the LangChain lessons

LangChain's Terminal Bench climb is the best public case study of harness
engineering as an empirical practice. The techniques that moved the needle:

1. **Self-verification loops.** The agent is required to plan → implement →
   test → fix before declaring victory; a pre-completion checklist middleware
   refuses "done" without a verification pass. In your repo, the equivalent is
   having tests the agent can actually run — and conventions that tell it to.
2. **Context assembly on the agent's behalf.** Their middleware maps the
   working directory at session start so the agent doesn't burn steps
   exploring. In Cursor, `AGENTS.md` and scoped rules do this job.
3. **Loop detection.** Middleware interrupts "doom loops" where the agent
   retries the same failing edit. Hooks give you the same observation point.
4. **A reasoning budget shaped like a sandwich.** Maximum thinking at planning
   and final verification, moderate in between. You don't control Cursor's
   models, but you control what the plan and the verification *check against*:
   your rules and your tests.

All four are harness properties, not model properties. All four have direct
equivalents in a Cursor repository, which is what the rest of this guide is
about.

## Harnessability: some codebases are easier to harness

Fowler calls out **ambient affordances** — properties of the environment that
make agents more governable:

- **Typed languages** give every edit a free, instant sensor (the compiler).
- **Clear module boundaries** shrink the context an agent needs per task.
- **Consistent conventions** turn guides from essays into bullet lists.
- **Fast test suites** make self-verification cheap enough to be habitual.

This is why the [maturity model](/guide/maturity-model) scores type checking
and test infrastructure alongside Cursor-specific artifacts: they are part of
the same control system.

## Where this guide goes

- Chapter 2 maps the full [Cursor harness surface](/guide/cursor-harness-surface) —
  every file and mechanism Cursor gives you.
- Chapters 3–5 cover the three control families in depth:
  [Guides](/guide/guides-feedforward), [Sensors](/guide/sensors-feedback), and
  [Guardrails](/guide/guardrails-and-safety).
- Chapter 6 defines a [five-level maturity model](/guide/maturity-model) with
  an objective maturity model.
- Chapter 7 shows how to [measure and improve](/guide/measure-and-improve)
  with the `harness-score` scanner and the Cursor plugin.
