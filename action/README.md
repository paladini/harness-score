# Harness Score GitHub Action

Runs the deterministic [harness-score](https://paladini.github.io/harness-score/)
scanner in CI: reports the repository's AI-harness maturity level, writes a
branded SVG pill (`harness` · `L4` — level only, 112×20), and (optionally)
fails the build below a minimum level so your harness only ratchets up. Because
the badge is re-rendered for the detected level on every run, publishing it
once gives you a self-updating README badge for free.

## Usage

```yaml
jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score/action@main
        with:
          min-level: '3'          # fail below L3 (0 = report only)
          badge: 'harness-badge.svg'
```

A per-run summary (level + dimension table) appears in the job summary. To
publish the badge, upload it as an artifact or commit it to a `badges`
branch, then reference it from your README:

```markdown
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `min-level` | `0` | Fail when maturity is below this level (0–4) |
| `badge` | `harness-badge.svg` | SVG pill (`harness` + level); empty to skip |
| `report` | _(empty)_ | Markdown report output path |
| `working-directory` | `.` | Directory to scan |
| `version` | `latest` | harness-score npm version |

## Outputs

`level` (0–4), `level-name`, `percent`.
