# Review Standards

Load this file at Step 3 of the workflow. It defines what each pass looks for, what it must never flag, and the bar for escalation. Global rule across all passes: generation optimizes for recall, verification (Step 4) optimizes for precision. Flag freely here; kill freely there.

## Pass A: Correctness and Logic

Flag only what you can trace as a concrete failing path in the diff, with the input or state that triggers it.

Look for: broken invariants (a function's contract violated by a new caller or a changed callee), unhandled failure paths that lose data or leave state partial, off-by-one and boundary errors on real boundaries, async ordering bugs (await missing where sequence matters, floating promises whose failure disappears), concurrency hazards that are concrete (shared mutable state with an actual interleaving, not a theoretical one), error swallowing that hides a failure the caller must know about, and resource lifecycles that leak on the error path.

Do not flag: hypothetical inputs the system cannot produce, missing handling for states upstream code makes impossible, or "what if someone later..." speculation. If you cannot name the triggering input, it is not a finding.

## Pass B: Security

Bar: flag only with high confidence (above 80%) of real exploitability, and only for issues newly introduced by this PR. Pre-existing security issues discovered along the way become 🟣 summary entries, never inline comments.

Categories to examine: injection (SQL, command, template, NoSQL, XXE, path traversal), authentication and authorization (bypass logic, privilege escalation, session flaws, JWT misuse), crypto and secrets (hardcoded credentials, weak algorithms, broken randomness, certificate validation bypass), data exposure (PII or high-value secrets written to logs, sensitive data in error messages or URLs), and unsafe deserialization or SSRF where the attacker controls host or protocol.

### Hard exclusions: never report these

1. Denial of service or resource exhaustion of any kind (memory, CPU, file descriptors, rate limiting).
2. Secrets stored on disk when otherwise secured; that is a separate process.
3. Missing input validation on fields with no demonstrated security impact.
4. Missing hardening. Absent best practices are not vulnerabilities; only concrete exploitable flaws are.
5. Theoretical race conditions or timing attacks. Only report a race that is concretely problematic.
6. Vulnerable outdated dependencies in general, with one exception: if Step 2 research surfaced a real advisory affecting the exact version this PR pins or adds, report it with the advisory URL as external evidence.
7. Memory-safety issues in memory-safe languages (Rust, Go, JS/TS, Python, Java). Do not report buffer overflows where the language makes them impossible.
8. Test-only files and fixtures.
9. Log spoofing via unsanitized input in log lines.
10. SSRF where the attacker controls only the path, not host or protocol.
11. User-controlled content flowing into AI prompts.
12. Regex injection and regex-based DoS.
13. Findings in documentation files.
14. Missing audit logs.

### Precedents: assume these

1. Environment variables and CLI flags are trusted; an attack that requires controlling them is invalid.
2. UUIDs are unguessable and need no validation.
3. Logging URLs is safe; logging high-value secrets in plaintext is a finding.
4. React and Angular escape output by default. Only flag XSS through `dangerouslySetInnerHTML`, `bypassSecurityTrustHtml`, or equivalent unsafe escapes.
5. Low-signal web issues (tabnabbing, XS-Leaks, prototype pollution, open redirects) only at extreme confidence with a traced exploit path.

## Pass C: Structure and Maintainability

This is the ambitious pass. Do not stop at "this could be a bit cleaner." Actively search for the restructuring that preserves behavior while making the implementation dramatically simpler; the goal is code that feels inevitable in hindsight. When there is a path to delete complexity instead of rearranging it, push hard for that path. Working code that makes the codebase messier does not get a pass for working.

### Standards

1. **Code judo.** For every meaningful change, ask whether a reframing exists that makes whole branches, helpers, modes, or layers disappear. A refactor that moves complexity around without reducing the number of concepts a reader must hold is not an improvement.
2. **File size.** A PR pushing a file from under 1000 lines to over 1000 lines is a presumptive blocker on quality grounds. Prefer extracting helpers, subcomponents, or modules first. Waive only for a compelling structural reason with the file still clearly organized.
3. **Spaghetti growth.** New ad-hoc conditionals, scattered special cases, or one-off branches inserted into unrelated flows are design problems, not style nits. Push the logic behind a dedicated abstraction, state machine, policy object, or module instead of tangling an existing path.
4. **Boring over magic.** Flag generic mechanisms that hide simple data-shape assumptions, thin wrappers, identity abstractions, and pass-through helpers that add indirection without buying clarity. Brittle or magical behavior is a quality problem even when it works.
5. **Types and boundaries.** Question unnecessary optionality, `unknown`, `any`, and cast-heavy code where a clearer type boundary could exist. A silent fallback papering over an unclear invariant is a signal the boundary should be explicit.
6. **Canonical layer and reuse.** Feature logic leaking into shared paths, implementation details leaking through APIs, and bespoke helpers duplicating an existing canonical utility all normalize architectural drift. Push code to the package, service, or module that already owns the concept.
7. **Orchestration and atomicity.** Independent work serialized for no reason, and related updates that can leave state half-applied, are design smells when the cleaner structure is obvious. Do not micro-optimize; do flag avoidable orchestration complexity.

### Primary questions per meaningful change

Is there a judo move that makes this dramatically simpler? Can the change be reframed so fewer concepts, branches, or layers are needed? Does it improve or worsen the local architecture? Did a cohesive module become more coupled, more stateful, or harder to scan? Is the logic in the right file and layer? Are repeated conditionals signaling a missing model or helper? Is the abstraction earning its keep, or is it a wrapper? Did the diff introduce casts, optionality, or ad-hoc shapes that obscure the real invariant?

### Escalate aggressively when you see

A complicated implementation where a cleaner reframing would delete whole categories of complexity; a file crossing 1000 lines because of the PR; new conditionals bolted onto unrelated paths; one-off booleans, nullable modes, or flags complicating existing control flow; feature logic inside general-purpose modules; copy-pasted logic instead of an extracted helper; narrow edge-case handling in the middle of an already busy function; "temporary" branching likely to become permanent debt; a bespoke helper where a canonical one exists; sequential async flow where independent work would be simpler in parallel.

### Preferred remedies (in rough order of ambition)

Delete a layer of indirection rather than polishing it. Reframe the state model so conditionals disappear instead of getting centralized. Move the ownership boundary so the feature becomes a natural extension of an existing abstraction. Turn special cases into a simpler default flow. Replace condition chains with a typed model or explicit dispatcher. Split a large file into focused modules. Separate orchestration from business logic. Collapse duplicate branches. Delete wrappers that do not clarify. Reuse the canonical helper. Make type boundaries explicit so control flow simplifies. Never settle for "maybe rename this" when the real issue is structural, and never settle for a cleaner version of a messy idea when a much simpler idea is plausibly available.

### Approval bar for this pass

Treat as presumptive blockers unless the author justifies them: preserved incidental complexity when a plausible judo move would delete it; the 1000-line crossing; ad-hoc branching that tangles an existing flow; feature checks scattered across shared code; an unnecessary abstraction, wrapper, or cast-heavy contract; a duplicated helper or logic in the wrong layer with a clear canonical home.

### Output priority for this pass

1. Structural regressions. 2. Missed dramatic simplifications. 3. Spaghetti and branching growth. 4. Boundary, abstraction, and type-contract problems. 5. File size and decomposition. 6. Modularity. 7. Legibility. Low-value nits are suppressed entirely when anything from tiers 1-4 exists.

## Pass D: AI Slop and Useless Code Comments

AI agents dirty code. This pass exists because slop compounds: every useless comment and defensive wrapper trains the next reader (human or agent) to add more.

### Useless code comments (flag for deletion)

The golden rule: a comment must explain WHY (a constraint, a trade-off, a non-obvious reason) or a genuinely non-obvious HOW. A comment narrating WHAT the next line does is a deletion, not a style preference.

Flag: comments that restate the code (`// increment counter`), narration and changelog comments (`// changed from X to Y`, `// new function added`, `// updated logic`), docstring bloat on trivial private helpers (a three-line docstring on a one-line getter), commented-out code (delete it; git remembers), TODO comments without an owner or issue reference, section-banner comments in short files, and comment style inconsistent with the surrounding file (JSDoc walls in a codebase that uses sparse inline comments).

### Code slop

Flag: defensive try/catch on trusted internal paths where failure should propagate, casts to `any` or equivalent used only to silence the type checker, deep nesting fixable with early returns, over-defensive null checks against states upstream code makes impossible, dead branches and parameters added "for later" (YAGNI), speculative abstractions with a single implementation, and configuration for values that never change.

Guardrail: suggested cleanups here keep behavior unchanged unless fixing a clear bug, and prefer minimal focused edits over broad rewrites.

## Pass E: Claims in the PR Description

Verification is not a recap; it proves or disproves a specific claim with evidence. For every claim the PR makes ("fixes X", "improves performance", "prevents the race"):

1. Restate it in falsifiable form: condition, expected behavior, threshold if quantitative.
2. Look for evidence in the PR: a test that fails without the change and passes with it, a repro, a benchmark, a linked issue with reproduction.
3. Evidence found and it holds: no finding.
4. Evidence absent: the finding is a question asking for it (🟠 when the risk warrants, 🟡 otherwise), never an assertion that the claim is false. "This claims to fix the race; which test covers the interleaving?" is the shape.
5. Never write "verified" or "confirmed" in the review about a claim you did not trace to evidence.

## Pass F: Bypasses, Duplication, and Gambiarras

This pass catches the workaround economy: code that dodges a check instead of satisfying it, re-implements what exists instead of reusing it, or ships a hack disguised as a solution. Step 1's `scan_bypasses.py` seeds this pass with deterministic candidates; judge every hit, and also look for what regexes cannot see.

### Bypasses (dodging a check)

Flag: suppression directives without an adjacent justification and issue link (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# noqa`, `# type: ignore`, `pylint: disable`, `rubocop:disable`, `@SuppressWarnings`, `nolint`, `biome-ignore`), tests dodged to make CI pass (`.skip`, `.only` left in, `xit`, `@pytest.mark.skip` without reason), assertions deleted or loosened so a failing test goes green, broad exception swallowing that silences a failure the caller must know about, TLS verification disabled (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify`), type-checker escapes (`as any`, `as unknown as X` double casts, non-null assertions papering over a real nullable), hooks bypassed in scripts (`--no-verify`), and environment-based dodges (`if (process.env.CI) return`-style branches that make code behave differently just to pass a check).

The rule: a suppression is acceptable only when it carries WHY plus an issue reference next to it. A naked suppression is a finding (🟡 or 🟠). A bypass that hides a real defect inherits the severity of the defect it hides, up to 🔴 on money, auth, or data paths.

### Duplication

Flag: copy-pasted blocks (cite both locations as evidence), a near-duplicate of an existing canonical helper (cross-reference Pass C standard 6), the same validation, regex, constant, or mapping re-implemented in a second place, and parallel type or schema definitions that will drift. The fix suggestion always names the canonical home: extract to the existing module, or reuse what is already there. Duplication findings require both `file:line` locations; one location is a suspicion, not evidence.

### Gambiarras, hacks, jeitinhos

Flag: magic numbers or strings encoding a business rule without a name, sleep or timeout used as synchronization (a delay is not a lock), retries wrapping a deterministic bug, monkey-patching or reflection to reach private internals, string-typed logic where a type or enum exists (parsing error messages by text, switching on class names), hand-edits to generated files, hardcoded URLs, paths, or environment assumptions, and "temporary" workarounds with no owner, no issue, and no ceiling.

A deliberate, labeled simplification is not a gambiarra: "skip X; add it when Y" with an owner and issue is an engineering decision. The difference is the label. Unlabeled, the same code is a finding, because the next reader cannot tell the ceiling was chosen from the ceiling being missed.
