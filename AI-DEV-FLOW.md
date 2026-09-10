# TLC AI Dev Flow in Harness Score

Harness Score vendors the four-skill TLC AI Dev Flow as a project-local,
tool-neutral development loop. The goal is not to make every change heavier.
It is to preserve intent across agent boundaries and spend review effort on
proof instead of reconstructing decisions from a diff.

The installed upstream source is pinned in
`.agents/skills/tlc-ai-dev-flow.lock.json`. Run `npm run test:skills` after an
update to catch an incomplete installation, renamed skill, or missing support
file.

## Route the work

| Work state | Skill | Durable output |
| --- | --- | --- |
| The problem or direction is still unclear | `tlc-discover` | `.design/<name>.md` |
| The outcome is decided but not cut into buildable slices | `tlc-plan` | `.tasks/<name>.md` |
| Expected behavior is concrete and ready to build | `tlc-implement` | `.checks/<name>.md` and verification report |
| A pull request needs code review | `the-judge` | One evidence-led review |

Start at the first row whose question is still open. A clear bug with a
reproduction and agreed expected behavior can start at `tlc-implement`. A
typo-only or similarly trivial, reversible change does not need the factory.

## What each station changes for this repository

### Discover

Use discovery before adding a check, changing scoring semantics, introducing a
new supported harness, or making another decision that affects how external
repositories are judged. It must establish the real problem, evidence, success
measure, boundary, and literal one-way decisions before implementation is
proposed. If the evidence supports not building, stopping is a valid result.

### Plan

Plan turns decided work into vertical slices with observable, concrete
criteria. For Harness Score, a scoring change normally has to keep the
implementation, maturity model, check catalog, fixtures, and localized guide
surfaces coherent in the same slice. Do not split these into horizontal tasks
such as “code first” and “docs later”. The plan explicitly sweeps validation,
failure modes, idempotency, authorization, concurrency, data lifecycle,
dependency failure, state transitions, and observability, marking why a
dimension does not apply when it truly does not.

### Implement

The repository uses the `standard` profile. Before code, implementation writes
a checklist in which every claim has a focused proof. It then builds whole
vertical slices and runs cheap proofs first. New behavioral proofs must also be
run against the feature base: if the agent-written test passes before the
patch, it does not prove the change. Existing tests may not be weakened or
silently rewritten to manufacture a green suite.

After the last slice, a fresh verifier reads the complete checklist, every
binding source, and the full `<feature-base>..HEAD` diff. The author cannot be
the verifier. The standard profile also requires a coverage join, explicit
test-policy verdicts where the repository does not already settle them, and
fault injection in an isolated scratch worktree.

The focused proofs do not replace the repository gate. Before a commit, run
the commands required by `AGENTS.md`. For a normal cross-surface change, the
final gate is:

```bash
npm test
npm run lint
npm run scan
npm run docs:build
npm run plugins:sync-check
```

Run `npm run bench` before and after changes to `packages/cli/src/scan.ts`.

### Judge

The Judge is the PR code-review station. It runs deterministic checks first,
researches current official documentation for every external claim, reviews
correctness, security, structure, AI-generated noise, PR-description claims,
and bypasses, then gates the review body with deterministic scripts. Findings
need verified evidence and are posted as one consolidated review only when the
user explicitly authorizes posting.

The Judge is deliberately narrower than `.agents/skills/pr-release-audit`.
Use the latter when deciding whether a Harness Score PR is merge-ready or a
release is complete: it additionally covers changesets, contributor credit,
guide and site parity, registries, Marketplace, releases, and Pages state.

## Artifact policy

- Keep `.design/` and `.tasks/` documents when they contain decisions future
  contributors must inherit.
- Keep `.checks/` on the feature branch as review evidence. Decide explicitly
  in the PR whether the checklist and verification report remain useful after
  merge; do not accumulate stale working artifacts by default.
- Never put unresolved product decisions into implementation. Send them back
  to discovery or planning.
- The v1 flow does not implement intake, triage, deployment, or production
  feedback automation. GitHub issues, labels, branch protection, releases,
  and monitoring remain the repository's existing mechanisms.

## Boundaries

The vendored skills authorize repository-local analysis and the local changes
the user requested. They do not independently authorize a push, a deployment,
a production mutation, a merge, or a GitHub review submission. Those actions
remain explicit human boundaries.

Upstream documentation:

- <https://agent-skills.techleads.club/tlc-ai-dev-flow/>
- <https://github.com/tech-leads-club/agent-skills>
