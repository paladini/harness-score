# Harness Score GitHub Action

Runs the deterministic [harness-score](https://paladini.github.io/harness-score/)
scanner in CI: reports the repository's AI-harness maturity level, writes a
branded SVG pill (`harness` · `L4`), and (optionally) fails the build below a minimum level so your harness only ratchets up. Because
the badge is re-rendered for the detected level on every run, publishing it
once gives you a self-updating README badge for free.

## Usage

```yaml
jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score@v1
        with:
          min-level: '3'          # fail below L3 (0 = report only)
          badge: 'harness-badge.svg'
```

A per-run summary (level + dimension table) appears in the job summary. To
publish the badge, upload it as an artifact or commit it to a `badges`
branch, then reference it from your README:

The Action fails closed when the snapshot selected by `gate` is incomplete
(file-count limit, depth limit, or unreadable relevant path such as an
`unreadable-path` or `unreadable-directory`, plus out-of-root symlinks).
Complete maturity
outputs, badges, and reports remain authoritative when only an additional
effective scope is incomplete. In that case, `gate: maturity` can pass with a
warning, while `gate: effective` exits 2. Effective outputs remain empty until
the effective snapshot is complete.

Pin a full commit SHA instead of `v1` for maximum supply-chain stability. The legacy
`paladini/harness-score/action@<ref>` entrypoint remains compatible, but the
root entrypoint is recommended because GitHub dependency-review can associate
it with this repository's MIT license.

```markdown
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

## Pull-request comments

Set `comment: 'true'` on a `pull_request` workflow to get a sticky comment
showing the score delta against the PR's base branch — "harness score moved
from L2 to L3 in this PR" instead of just a snapshot. It updates the same
comment on every push (matched via a hidden marker), rather than posting a
new one each time.

This is opt-in and requires the calling workflow to grant
`pull-requests: write` — the action cannot request that permission for you:

When `config` is set, the main scan, base-branch baseline, and current diff all
use that same explicit configuration. Leave `config` empty to preserve config
autodiscovery in each scanned tree.

```yaml
on:
  pull_request:

permissions:
  pull-requests: write

jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score@v1
        with:
          comment: 'true'
```

Under the hood this scans the PR head (the normal step above), then scans
the base branch's tip commit into a temporary `git worktree` and diffs the
two with `harness-score --diff` — no extra checkout step needed, and no
history is written back to your repository.

Two pushes in quick succession can race and post two comments instead of
updating one. If that matters for your repo, add a concurrency group scoped
to the PR:

```yaml
concurrency:
  group: harness-score-${{ github.event.pull_request.number }}
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `min-level` | `0` | Fail when the complete gated score is below this level (0–4); an incomplete gated snapshot exits 2 |
| `badge` | `harness-badge.svg` | SVG pill (`harness` + level); empty to skip |
| `report` | _(empty)_ | Markdown report output path |
| `working-directory` | `.` | Directory to scan |
| `version` | `1.6.5` | harness-score npm version or package spec |
| `comment` | `false` | Post/update a sticky PR comment with the score delta (`pull_request` events only; requires `pull-requests: write`) |
| `include-user-harness` | `false` | Include the user-level harness in the effective snapshot |
| `include-system-harness` | `false` | Include the system-level harness in the effective snapshot |
| `gate` | `maturity` | Select which snapshot `min-level` and incomplete-scan failures use |
| `config` | _(empty)_ | Pass a specific scanner configuration file |

## Outputs

`level` (0–4), `level-name`, and `percent` describe maturity and are published
only when maturity is complete. `effective-level` and `effective-percent` are
published only when the effective snapshot is complete.
