---
name: release
description: Use when the user asks to release, publish, or version-bump harness-score — covers the npm package, the Cursor plugin, and the docs, in the right order.
---

# Releasing harness-score

1. Verify green: `npm test`, `npm run lint`, `npm run scan` (must be L4),
   `npm run docs:build`.
2. Bump versions **together** — preferably via changesets: run
   `npm run version-packages` (runs `changeset version`, which bumps
   `packages/cli/package.json` and writes `packages/cli/CHANGELOG.md` from
   accumulated `.changeset/*.md` files, then `scripts/sync-version.mjs`,
   which mirrors the new version into `TOOL_VERSION` and `jsr.json` —
   changesets doesn't know about either file on its own). Review the diff.
   If no changesets were added since the last release, bump all three by
   hand instead:
   - `packages/cli/package.json`, `TOOL_VERSION` in
     `packages/cli/src/score.ts`, and `version` in `packages/cli/jsr.json`
   - `plugins/cursor/.cursor-plugin/plugin.json` (+ entry in
     `plugins/cursor/CHANGELOG.md`) — only if Cursor plugin content
     changed, it has its own release track
   - `plugins/claude-code/.claude-plugin/plugin.json` — only if Claude
     Code plugin content changed; no separate publish step, a version bump
     + push to `main` is the entire release (the marketplace *is* this
     repo)
3. Commit `release: vX.Y.Z`, tag `vX.Y.Z`, push with tags.
4. Create a GitHub Release from that tag — use the new
   `packages/cli/CHANGELOG.md` entry as the notes body if changesets
   produced one, otherwise `gh release create vX.Y.Z --generate-notes` —
   this fires `.github/workflows/release.yml`, which publishes to all
   three registries via OIDC, no secrets stored anywhere:
   - **npmjs.org** as `harness-score`, via
     [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — the
     user configures this once on the package's npmjs.com settings page
     (repo + workflow filename), then every CI run authenticates
     automatically, bypassing the 2FA/OTP prompt entirely.
   - **GitHub Packages** as `@paladini/harness-score` (automatic, uses the
     built-in `GITHUB_TOKEN`, no secret needed — the repo's Actions
     "Workflow permissions" must be set to Read and write).
   - **JSR** as `@paladini/harness-score` (automatic via OIDC — but the
     scope must be claimed once by the user at jsr.io/new before the first
     publish succeeds).
5. If npm Trusted Publishing isn't configured yet, `npm publish` in CI will
   fail with a clear error; the user completes the one-time npmjs.com setup
   and the next run succeeds — no manual local publish needed once it's on.
6. Cursor Marketplace: the listing updates from the repo — remind the user
   to resubmit at https://cursor.com/marketplace/publish only if
   `plugins/cursor/` metadata changed. Claude Code has no separate
   marketplace to resubmit to — see step 2.
7. Docs deploy automatically via `.github/workflows/pages.yml` on push to
   main.
