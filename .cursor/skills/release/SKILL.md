---
name: release
description: Use when the user asks to release, publish, or version-bump harness-score — covers the npm package, the Cursor plugin, and the docs, in the right order.
---

# Releasing harness-score

1. Confirm every user-facing change has a changeset with an English summary
   and explicit contributor credit when applicable. Commit metadata alone is
   not sufficient attribution.
2. On a clean release branch from `main`, run
   `npm run release:prepare -- --summary "One sentence explaining why this release matters."`.
   This versions the package from changesets, mirrors the version into
   `TOOL_VERSION`, `jsr.json`, `package-lock.json`, both byte-identical GitHub
   Action entrypoints, and the Action README, runs all release gates, and
   writes a polished preview under `.release/`. Review both the diff and the
   rendered notes.
   - `plugins/cursor/.cursor-plugin/plugin.json` (+ entry in
     `plugins/cursor/CHANGELOG.md`) — only if Cursor plugin content
     changed, it has its own release track
   - `plugins/claude-code/.claude-plugin/plugin.json` — only if Claude
     Code plugin content changed; no separate publish step, a version bump
     + push to `main` is the entire release (the marketplace *is* this
     repo)
3. Open and merge a `release: vX.Y.Z` PR. Do not create a tag or release from
   the unmerged branch.
4. After merge, dispatch `.github/workflows/prepare-release.yml` from `main`
   with the exact version, a short title, and the one-sentence summary. It
   reruns the gates, validates every version surface, generates release notes
   from the changelog, preserves contributor credit, creates the immutable
   tag, and opens a draft release.
5. Review the draft in GitHub. Select **Publish this Action to the GitHub
   Marketplace**, using **Code quality** as the primary category and
   **Continuous integration** as the secondary, then publish. This checkbox
   is manual because GitHub exposes no Marketplace publication API.
6. Publishing fires `.github/workflows/release.yml`, which validates the
   public release notes and publishes to all three registries:
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
7. The workflow moves the stable major Action tag only after every registry
   succeeds, then verifies npm, GitHub Packages, JSR, the GitHub Release, the
   stable tag, the Marketplace listing, and Pages. Never move `v1` manually
   before those gates pass. If a job
   fails, use **Re-run failed jobs**, not a full rerun that would try to
   republish immutable registry versions.
8. Cursor Marketplace: the listing updates from the repo — remind the user
   to resubmit at https://cursor.com/marketplace/publish only if
   `plugins/cursor/` metadata changed. Claude Code has no separate
   marketplace to resubmit to — see step 2.
9. Docs deploy automatically via `.github/workflows/pages.yml` on push to
   `main`; verify the public Pages site separately.
