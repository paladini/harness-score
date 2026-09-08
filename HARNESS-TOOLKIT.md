# Harness Toolkit pilot

This repository uses Harness Toolkit as optional, project-local development infrastructure. The pilot raises the chance that an agent finishes the intended work and produces evidence tied to the exact repository state. It does not change the scanner, its public API, its score, or its zero-runtime-dependency contract.

The pinned reference is `@tech-leads-club/harness-toolkit@0.11.1`. Setup needs Node 24 or newer because that is the toolkit's development-runtime requirement. The published scanner continues to support Node 18 or newer.

```mermaid
flowchart LR
  A[Agent edits] --> B[Project Biome formatting]
  B --> C[Toolkit grind: task checks]
  C -->|failure and loop below 3| A
  C --> D[Clean final commit]
  D --> E[Full content-bound verification]
  E --> F[harness-reviewer on this HEAD]
  F -->|findings| A
  F --> G[PR, only when requested]
  G --> H[Independent CI]
```

## Isolation and ownership

`npm run harness:setup` installs the exact package version under `.cache/harness-toolkit/`, materializes its runtime there, and generates provider wiring in isolated config directories. It then merges project launchers into `.cursor/hooks.json` and `.claude/settings.json`. The setup snapshots the relevant global Cursor, Claude and TLC paths before and after installation and refuses activation if any changed. It does not add a package dependency, update the global `PATH`, or install global hooks.

The versioned policy is `.tlc/harness/config.json`. Runtime, state, logs, lessons, evaluation records and verification evidence are ignored. Every hook invokes `scripts/harness/hook.mjs`, which supplies the isolated environment explicitly. An enabled pilot with a missing runtime reports `HARNESS DEGRADED` and denies acting events; it cannot silently count the toolkit as operational.

The project's existing controls remain authoritative:

| Control | Responsibility |
| --- | --- |
| `guard-shell.js` | Project-specific destructive-command policy, including npm publication and hard reset. |
| `format-on-edit.js` | Advisory formatting with the repository-pinned Biome binary; it never downloads a formatter. |
| Harness Toolkit | Session context, grind feedback, policy gates, lessons, redaction, observations and review evidence. |
| Husky | Exact-content test gate before commit and full delivery gate before push, including work outside an editor. |
| CI | Re-runs repository checks on the pushed commit in a separate environment. |

No hook depends on another hook's order. Formatting is advisory, lint is decisive, Git gates cover non-editor work, and CI does not trust local evidence.

## Commands

Run setup only in this repository worktree:

```powershell
npm run harness:setup
npm run harness:status
npm run test:harness:integration
```

Use `npm run harness:toolkit -- <command>` instead of a global `tlc` command. This is deliberate: toolkit 0.11.1 does not create a CLI link for a relocated installation. Its Windows doctor also reports the two valid project-isolated `harness-init` links as outside the runtime because it compares mixed path separators. These three doctor failures are known 0.11.1 diagnostics under this isolation model; `harness:status` checks the runtime version/files and verifies that global files remain unchanged. The upstream capability inventory also lists `docsGate` as off when `docs.command` is an argv array, although the stop gate consumes that command. Integration tests exercise the real hook entrypoints instead of treating those doctor rows as proof.

Verification commands are proportional:

```powershell
npm run harness:verify -- test
npm run harness:verify -- docs
npm run harness:verify -- commit
npm run harness:verify -- full --fresh
npm run harness:verify -- ready
```

The full gate runs canonical tests, lint, coverage, consumer type checking, published-export checking, documentation, generated-plugin synchronization and the L4 scanner. When the pilot is active, it also runs the real toolkit integration tests. It always rejects any scanner runtime dependency. Results record the HEAD, a SHA-256 fingerprint of all tracked and untracked nonignored input files, exact argv, exit codes and durations. Any edit, deletion, config change, Node change, activation change or new commit invalidates reuse. Timeouts, partial runs and command failures write `fail`, never `pass`.

`release:prepare` is intentionally absent because it changes versions. PR creation and `gh pr ready` are recognized in native, `rtk`, and `rtk proxy` forms. The launcher requires a clean worktree and matching full evidence; operator rules additionally require an observed `harness-reviewer` run for the current HEAD. Neither gate grants permission to open, merge or publish.

## Reviewer contract

Cursor and Claude Code both receive a read-only `harness-reviewer`. Give it the objective, base commit, final HEAD, full diff and verification evidence. It must report the reviewed HEAD, findings ordered by severity, affected contracts, inspected evidence, limitations and an approve/request-changes verdict. If it finds a problem, change the code, commit, verify and review the new HEAD again.

The observation proves that the reviewer ran. It does not prove that its judgment is correct. Deterministic checks and CI remain separate sources of evidence.

## Policy choices

The project policy enables grind with three loops and no automatic file attachment; failure feedback and classification; progressive handoff/context; autopilot; lessons; plan, supply-chain, documentation and operator rules; framed external content; secret-output redaction; and local observability without payloads for 14 days.

Comment enforcement remains observational. Duplication checks are disabled because generated plugin content and deliberate monorepo repetition would add noise. Model allowlists, Fast blocking, repeated-command blocking, idle-turn blocking, budget continuation, global spool, ship claims and empty-diff anti-ship are disabled. Delivery relies on content-bound checks and review evidence instead of textual PASS markers.

For implementation work, state `HARNESS_PLAN: <paths>` before editing. If scope changes, state `HARNESS_PLAN_DEVIATION: <path> — <reason>` so the deviation is explicit and reviewable.

## Acceptance evaluation

Run the same objective and model with and without the toolkit for six scenarios in each editor: simple edit, tested fix, documentation, generated plugin, configuration/dependency and review-required change. Record duration, human interventions, pre-delivery failures caught, false blocks, retries, check time and injected context size:

```powershell
npm run harness:evaluate -- record --runId run-01 --provider claude --mode toolkit --scenario tested-fix --model model-name --objective objective-id --durationMs 120000 --interventions 1 --failuresDetected 1 --falseBlocks 0 --retries 1 --checkMs 30000 --contextChars 900
npm run harness:evaluate -- report
```

Promotion requires all 24 provider/mode/scenario records, no protection regression, no writes outside the listed destinations, every seeded critical failure caught before delivery, no ready PR with missing/stale evidence, no unbounded loop, median overhead of at most 20% for already-passing simple work, and evidence of reduced intervention or successful correction in failing scenarios. Cursor and Claude Code are promoted independently. A synthetic entrypoint test does not substitute for a real editor session.

## Disable, recover and update

`npm run harness:disable` removes only toolkit launchers from the two project hook documents. It preserves project guards, formatter hooks, runtime and evidence for diagnosis. Running setup again is idempotent.

Before updating, compare `npm view @tech-leads-club/harness-toolkit version` with the pinned `VERSION` in `scripts/harness/common.mjs`, inspect upstream hook/config changes, change the exact version, run setup twice, run unit and integration tests, exercise one real session per editor, and repeat the full verification. Promote the new version only after both editors meet their own acceptance criteria.

The design shifts memory and repetition away from the developer: the human chooses the goal and trade-offs; the implementing agent changes the repository; deterministic tools verify concrete properties; an independent agent challenges the reasoning; CI verifies the delivered commit. The remaining human work is judgment about product value, adequacy of the criteria and acceptable cost.
