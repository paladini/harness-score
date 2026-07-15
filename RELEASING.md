# Releasing (maintainer)

Publishing is automated end-to-end via [OIDC/Trusted Publishing](https://docs.npmjs.com/trusted-publishers) —
no npm token, no long-lived secret stored anywhere in this repo.

1. **Verify green:** `npm test`, `npm run lint`, `npm run scan` (must report
   L4), `npm run docs:build`.
2. **Bump versions together** — these three must always match:
   - `packages/cli/package.json` (`version`)
   - `TOOL_VERSION` in `packages/cli/src/score.ts`
   - `version` in `packages/cli/jsr.json`
   - If Cursor plugin content changed: `plugins/cursor/.cursor-plugin/plugin.json` +
     an entry in `plugins/cursor/CHANGELOG.md` (it has its own release
     track and version number).
   - If the Claude Code plugin content changed: bump `version` in
     `plugins/claude-code/.claude-plugin/plugin.json` — no separate publish
     step, the marketplace *is* this repo (see step 6).

   Preferred way to do this: contributors add a changeset
   (`npm run changeset`) describing their change and its bump type
   (patch/minor/major) in the same PR; at release time, run
   `npm run version-packages` — this runs `changeset version` (bumps
   `packages/cli/package.json` and writes `packages/cli/CHANGELOG.md` from
   the accumulated changesets) followed by `scripts/sync-version.mjs`,
   which mirrors the new version into `TOOL_VERSION` and `jsr.json` (changesets
   has no notion of either file, so this closes that gap). Review the diff,
   then continue at step 3. If no changesets were added for a release,
   bump all three by hand as before.
3. Commit `release: vX.Y.Z`, tag `vX.Y.Z`, push with tags.
4. Create a GitHub Release from that tag. If `packages/cli/CHANGELOG.md`
   gained an entry for this version (via changesets), copy that section
   into the release notes instead of relying on bare auto-generated notes:
   ```bash
   gh release create vX.Y.Z --notes-file path/to/notes.md
   # or, with no CHANGELOG.md entry for this release:
   gh release create vX.Y.Z --generate-notes
   ```
   This fires [`release.yml`](.github/workflows/release.yml), which
   publishes to all three registries automatically:
   - **npm** as [`harness-score`](https://www.npmjs.com/package/harness-score),
     via Trusted Publishing. One-time setup only: on the
     [package's settings page](https://www.npmjs.com/package/harness-score/access),
     add a Trusted Publisher with repo `paladini/harness-score` and workflow
     `release.yml`. After that, every release authenticates automatically —
     no 2FA/OTP prompt.
   - **GitHub Packages** as `@paladini/harness-score`, using the built-in
     `GITHUB_TOKEN` — no secret to manage. Requires the repo's Actions
     "Workflow permissions" to be set to *Read and write*.
   - **JSR** as `@paladini/harness-score`, via OIDC — no token at all. The
     scope must be claimed once at [jsr.io/new](https://jsr.io/new) before
     the first publish succeeds. **Deliberately publishes raw `src/**/*.ts`**
     (see `packages/cli/jsr.json`), not the `dist/` bundle npm/GitHub
     Packages ship — JSR consumes and type-checks TypeScript natively, so
     shipping source there avoids a build step and gives JSR consumers the
     original (non-minified) code with inline JSDoc. This means the three
     registries are not byte-for-byte identical artifacts of the same
     release; all three still expose the same public API (checked by
     `packages/cli/test/golden-output.test.ts` and the `attw`/type-smoke
     checks against the npm-published shape).
5. If npm Trusted Publishing isn't configured yet, `npm publish` in CI fails
   with a clear error; complete the one-time npmjs.com setup and re-run —
   no manual local publish is ever needed once it's wired up.
6. **Cursor Marketplace:** the listing points at the repo, so most changes
   need nothing further. Resubmit at
   [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
   only if `plugins/cursor/.cursor-plugin/plugin.json` metadata (name,
   description, version) changed.
   **Claude Code:** no registry, no resubmission — the marketplace *is*
   this git repo (`.claude-plugin/marketplace.json`). A `plugins/claude-code/.claude-plugin/plugin.json`
   version bump and a push to `main` is the entire release; users already
   on the marketplace pick it up via `/plugin marketplace update`.
7. **Docs:** deploy automatically via
   [`pages.yml`](.github/workflows/pages.yml) on every push to `main` — no
   manual step.

See also the [`release` skill](.cursor/skills/release/SKILL.md), which
encodes this same checklist for the agent.
