# Releasing (maintainer)

Harness Score uses a two-workflow release pipeline. A maintainer prepares and
merges the version changes, the **Prepare release** workflow creates a tagged
draft with polished notes, and publishing that draft triggers **Publish
release**. Registry authentication uses OIDC or the built-in `GITHUB_TOKEN`;
there are no long-lived publishing secrets in the repository.

## 1. Prepare the version PR

Every user-facing PR must include a changeset with the bump type, an English
description, and explicit contributor credit when the change came from an
outside contributor. For example:

```md
---
'harness-score': patch
---

Describe the user-visible change.

Thanks to [@handle](https://github.com/handle) for contributing this change.
```

From a clean release branch based on `main`, run:

```bash
npm run release:prepare -- --summary "One sentence explaining why this release matters."
```

This command:

1. runs `changeset version`;
2. mirrors the package version into every project-specific release surface;
3. runs tests, lint, the L4 self-scan, and the documentation build; and
4. writes a preview to `.release/release-notes-vX.Y.Z.md`.

The synchronized surfaces are:

- `packages/cli/package.json`;
- `TOOL_VERSION` in `packages/cli/src/score.ts`;
- `packages/cli/jsr.json`;
- the `packages/cli` workspace entry in `package-lock.json`;
- `action.yml` and `action/action.yml`, which must remain byte-identical; and
- the version input documented in `action/README.md`.

Review the diff and the rendered notes, then open and merge a
`release: vX.Y.Z` PR. Do not create the tag before that PR is merged.

If a release intentionally has no changeset, bump
`packages/cli/package.json`, run `node scripts/sync-version.mjs`, run the four
release gates, and generate the notes explicitly:

```bash
npm run release:notes -- --summary "One sentence explaining why this release matters."
```

## 2. Create the tagged draft

After the version PR is merged, open **Actions → Prepare release → Run
workflow** on `main` and provide:

- `version`: the exact stable `X.Y.Z` package version;
- `title`: a short title without the version; and
- `summary`: a one-sentence introduction for the release notes.

The workflow reruns every release gate, validates all synchronized versions,
generates structured notes from the matching changelog section, preserves
contributor credits, refuses existing tags/releases, creates `vX.Y.Z` at the
validated `main` commit, and opens a draft GitHub Release.

## 3. Publish the GitHub Release and Marketplace entry

Open the draft and verify its title and rendered notes. Select **Publish this
Action to the GitHub Marketplace**, with **Code quality** as the primary
category and **Continuous integration** as the secondary category, then
publish the release.

The Marketplace selection is the only manual publication gate. GitHub's
[Marketplace publication flow](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace)
exposes it only in the release UI, not through the Releases or Actions APIs.
The repository must stay public, keep `action.yml` at the root, and keep its
Action name unique.

## 4. Let the publication workflow finish

Publishing the draft triggers
[`release.yml`](.github/workflows/release.yml). It fails closed unless the tag,
package, changelog, Action metadata, release-note structure, and every required
contributor credit agree. It then publishes in parallel to:

- **npm** as [`harness-score`](https://www.npmjs.com/package/harness-score),
  using Trusted Publishing/OIDC;
- **GitHub Packages** as `@paladini/harness-score`, using `GITHUB_TOKEN`; and
- **JSR** as `@paladini/harness-score`, using OIDC.

Only after all three registry jobs succeed does the workflow move the stable
major Action tag (`v1` for a `v1.x.y` release) to the immutable release tag.
The final job independently verifies npm, GitHub Packages, JSR, the GitHub
Release, the stable Action tag, the Marketplace's advertised latest release,
and the Pages deployment for the release commit, with retries for propagation.

If one publication job fails, fix its one-time configuration and use
**Re-run failed jobs**. Do not re-run every successful registry job: registries
reject publishing the same immutable version twice.

The pipeline accepts stable releases only. Add an explicit prerelease policy
before publishing an alpha, beta, or release candidate.

## 5. One-time registry configuration

- **npm:** on the
  [package settings page](https://www.npmjs.com/package/harness-score/access),
  configure a Trusted Publisher for repository `paladini/harness-score` and
  workflow `release.yml`.
- **GitHub Packages:** repository Actions workflow permissions must allow
  writes. The workflow grants only `packages: write` to that job.
- **JSR:** claim `@paladini/harness-score` once at
  [jsr.io/new](https://jsr.io/new). JSR deliberately publishes the TypeScript
  source selected by `packages/cli/jsr.json`; npm and GitHub Packages publish
  the built package. Their public API remains the same, but the artifacts are
  not byte-identical.

## 6. Plugins and documentation

- **Cursor Marketplace:** resubmit at
  [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) only
  when `plugins/cursor/.cursor-plugin/plugin.json` metadata changed. The Cursor
  plugin has its own version and `plugins/cursor/CHANGELOG.md`.
- **Claude Code:** its marketplace is this repository. When Claude plugin
  content changes, bump `plugins/claude-code/.claude-plugin/plugin.json`; a
  merge to `main` is the release.
- **Documentation:** [`pages.yml`](.github/workflows/pages.yml) deploys every
  push to `main`. Verify the public site separately; a green package workflow
  does not prove that Pages is current.

See also the [`release` skill](.cursor/skills/release/SKILL.md) and the
[`pr-release-audit` skill](.agents/skills/pr-release-audit/SKILL.md).
