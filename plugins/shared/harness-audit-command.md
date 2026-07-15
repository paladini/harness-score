# /harness-audit

Audit this repository's AI harness maturity. Follow these steps exactly:

1. Run the deterministic scanner from the workspace root:

   ```bash
   npx -y harness-score . --json
   ```

   Do not analyze the repository yourself — the scanner's output is the
   audit. It is fully deterministic (filesystem checks only, no AI, no
   network), so its numbers are reproducible facts.

2. Present the results to the user:
   - The maturity level (`level.index`, `level.name`) and total score,
     with one sentence of interpretation.
   - A compact table of the six dimensions with their percentages.
   - **The top 3 failed checks by points** (`checks[]` where `passed` is
     false, sorted by `points` descending): for each, give the check id,
     what is missing (`evidence`), the concrete fix (`remediation`), and the
     guide link (`docsUrl`).
   - If `level.nextLevelGaps` is non-empty, state exactly what blocks the
     next level.

3. End by offering: "Want me to fix any of these? I can create the missing
   harness files following the guide's recipes." If the user accepts, use
   the harness-engineering skill.

If `npx` fails (offline/registry blocked), say so and suggest installing the
CLI locally with `npm i -D harness-score`; never substitute your own
estimate for the scanner's output.
