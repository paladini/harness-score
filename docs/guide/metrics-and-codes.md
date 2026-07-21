# Metrics & Codes Reference

Dense cheat sheet for everything `harness-score` reports: scores, scopes,
levels, dimensions, check IDs, configuration keys, CLI flags, Action inputs,
and JSON fields. Remediation recipes live in
[chapter 8 — Measure & Improve](./measure-and-improve#the-check-catalog).

## Scores: maturity vs effective

| Code | What it includes | Used for |
|---|---|---|
| **maturity** | Repository files only (`scopes: repo`) | Default CI gate, badge, `--min-level`, official team maturity |
| **effective** | Repo ∪ configured global/extra scopes | Local “what the agent sees on this machine” when user/system harness is enabled |

When no extra scopes are configured, `effective` equals `maturity` (same level,
score, and checks). The report always includes both blocks for stable JSON.

Set which score gates CI with `gate` in config, `--gate`, or the Action `gate`
input (`maturity` default).

## Scopes

| Scope | Meaning | What is scanned |
|---|---|---|
| `repo` | Always on | The directory you pass to `harness-score` (default `.`) |
| `user` | Opt-in | Allowlisted user-level paths mapped to repo-relative shapes: `~/.cursor/*`, `~/.claude/*`, `~/.codeium/windsurf/*` (Windsurf global rules alias), `~/Documents/Cline/Rules` → `.clinerules/`, `~/.continue/{rules,prompts}`, `~/.agents/*`, `~/.zed/commands`, `~/.config/opencode/agents`, global MCP/hooks configs, etc. See [multi-harness — user-scope by tool](./multi-harness#user-scope-by-tool). **Not included:** Copilot global (repo-only), Continue inline rules in `config.yaml`, IDE-only Cursor User Rules. |
| `system` | Opt-in | Reserved for validated system-wide installs (minimal in v1) |
| `extraRoots` | Opt-in | Additional directories (relative or absolute) whose tree mirrors harness layout — e.g. a shared team harness checkout |

Project files **win** over overlay paths on conflict (same relative path).

**Not scanned:** Cursor User Rules stored only in the IDE UI (not on disk),
arbitrary home-directory walks, or secrets content in evidence strings.

## Levels (L0–L4)

Official level names apply to **maturity** unless you set `gate: effective`.

| Level | Name | Requirements (all previous levels +) |
|---|---|---|
| L0 | Unharnessed | — |
| L1 | Documented | context ≥ 40% |
| L2 | Guided | context ≥ 60%; skills ≥ 30% **or** hooks ≥ 30%; hygiene ≥ 50% |
| L3 | Sensing | sensors ≥ 60%; ci ≥ 50% |
| L4 | Self-correcting | hooks ≥ 70%; total ≥ 80% |

Full narrative: [The Maturity Model](./maturity-model).

## Dimensions

| ID | Title | Max pts | Measures |
|---|---|---|---|
| `context` | Context & Guides | 20 | AGENTS.md, scoped rules, README |
| `skills` | Skills & Commands | 17 | Skills, commands/workflows, subagents |
| `hooks` | Hooks & Guardrails | 14 | hooks.json / Claude settings hooks |
| `sensors` | Sensors & Feedback | 20 | Tests, linter, types, formatter |
| `ci` | CI Feedback | 14 | Pipeline, pre-commit |
| `hygiene` | Hygiene & Safety | 23 | .gitignore, secrets, lockfile, license, MCP hygiene |

**Total:** 108 points.

## Check catalog

Stable IDs — linked to remediation in [Measure & Improve](./measure-and-improve#the-check-catalog).

### Context & Guides

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| CTX-01 | 4 | Root `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` exists | [ctx-01](./measure-and-improve#ctx-01) |
| CTX-02 | 3 | Context file has ≥20 meaningful lines and ≥2 headings | [ctx-02](./measure-and-improve#ctx-02) |
| CTX-03 | 4 | At least one scoped rule file (any supported tool) or nested context file | [ctx-03](./measure-and-improve#ctx-03) |
| CTX-04 | 3 | Every rule declares activation metadata in frontmatter | [ctx-04](./measure-and-improve#ctx-04) |
| CTX-05 | 2 | Not every rule is blanket always-on | [ctx-05](./measure-and-improve#ctx-05) |
| CTX-06 | 2 | No single rule file exceeds 500 lines | [ctx-06](./measure-and-improve#ctx-06) |
| CTX-07 | 1 | `README.md` at repository root | [ctx-07](./measure-and-improve#ctx-07) |
| CTX-08 | 1 | No legacy `.cursorrules` without modern scoped rules | [ctx-08](./measure-and-improve#ctx-08) |

### Skills & Commands

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| SKL-01 | 4 | At least one `SKILL.md` under a recognized skills directory | [skl-01](./measure-and-improve#skl-01) |
| SKL-02 | 3 | Every skill has `name:` and `description:` in frontmatter | [skl-02](./measure-and-improve#skl-02) |
| SKL-03 | 3 | Command/workflow files exist for any supported tool | [skl-03](./measure-and-improve#skl-03) |
| SKL-04 | 2 | Skill descriptions are ≥40 characters | [skl-04](./measure-and-improve#skl-04) |
| AGT-01 | 3 | At least one subagent markdown file | [agt-01](./measure-and-improve#agt-01) |
| AGT-02 | 2 | Every subagent has `name:` and `description:` frontmatter | [agt-02](./measure-and-improve#agt-02) |

### Hooks & Guardrails

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| HKS-01 | 4 | Hooks config exists and parses as JSON | [hks-01](./measure-and-improve#hks-01) |
| HKS-02 | 2 | Hooks declare version/metadata and known event names | [hks-02](./measure-and-improve#hks-02) |
| HKS-03 | 4 | A gate-class hook is registered (shell/MCP/read/tool gate) | [hks-03](./measure-and-improve#hks-03) |
| HKS-04 | 2 | A feedback-class hook is registered (post-edit/tool) | [hks-04](./measure-and-improve#hks-04) |
| HKS-05 | 2 | Every hook script path referenced in config exists in the repo | [hks-05](./measure-and-improve#hks-05) |

### Sensors & Feedback

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| SNS-01 | 6 | Test runner configured (`package.json` script, pytest, go test, etc.) | [sns-01](./measure-and-improve#sns-01) |
| SNS-02 | 5 | Linter configured (eslint, biome, ruff, golangci-lint, …) | [sns-02](./measure-and-improve#sns-02) |
| SNS-03 | 4 | Type checking configured (tsconfig, mypy, pyright, …) | [sns-03](./measure-and-improve#sns-03) |
| SNS-04 | 3 | Formatter configured (prettier, black, gofmt, …) | [sns-04](./measure-and-improve#sns-04) |
| SNS-05 | 2 | At least one test file exists in the tree | [sns-05](./measure-and-improve#sns-05) |

### CI Feedback

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| CI-01 | 4 | CI pipeline file present (GitHub Actions, GitLab CI, …) | [ci-01](./measure-and-improve#ci-01) |
| CI-02 | 4 | CI runs the test suite | [ci-02](./measure-and-improve#ci-02) |
| CI-03 | 4 | CI runs lint or typecheck | [ci-03](./measure-and-improve#ci-03) |
| CI-04 | 2 | Pre-commit or git hook tooling installed | [ci-04](./measure-and-improve#ci-04) |

### Hygiene & Safety

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| HYG-01 | 4 | `.gitignore` present | [hyg-01](./measure-and-improve#hyg-01) |
| HYG-02 | 3 | `.gitignore` covers environment files | [hyg-02](./measure-and-improve#hyg-02) |
| HYG-03 | 4 | No unprotected `.env` files (without `.env.example` pattern) | [hyg-03](./measure-and-improve#hyg-03) |
| HYG-04 | 4 | MCP JSON configs contain no inline credential patterns | [hyg-04](./measure-and-improve#hyg-04) |
| HYG-05 | 2 | `LICENSE` file present | [hyg-05](./measure-and-improve#hyg-05) |
| HYG-06 | 3 | No credential-like signatures in harness markdown/JSON | [hyg-06](./measure-and-improve#hyg-06) |
| HYG-07 | 3 | Dependency lockfile committed | [hyg-07](./measure-and-improve#hyg-07) |
| HYG-08 | 4 | MCP configs use env interpolation for secrets | [hyg-08](./measure-and-improve#hyg-08) |

## Configuration file (`.harness-score.json`)

Optional JSON at the scan root (strict schema — unknown keys error):

```json
{
  "scopes": {
    "user": false,
    "system": false
  },
  "extraRoots": [
    { "id": "team-shared", "path": "../shared-harness" }
  ],
  "gate": "maturity"
}
```

| Key | Type | Default | Meaning |
|---|---|---|---|
| `scopes.user` | boolean | `false` | Include user-level harness overlay |
| `scopes.system` | boolean | `false` | Include system-level overlay |
| `extraRoots` | `{ id, path }[]` | `[]` | Extra harness trees merged into effective |
| `gate` | `"maturity"` \| `"effective"` | `"maturity"` | Which score `--min-level` uses |

Precedence: **CLI flags → Action inputs → config file → defaults**.

## CLI flags (scan configuration)

| Flag | Meaning |
|---|---|
| `--config <file>` | Load config from a specific path |
| `--scope user` | Enable user scope (comma-separated: `user`, `system`) |
| `--gate maturity\|effective` | Score used for `--min-level` |
| `--min-level <0-4>` | Exit 1 when gated score is below level |
| `--json` | Full report including `scopes`, `gate`, `effective` |

## GitHub Action inputs

| Input | Default | Meaning |
|---|---|---|
| `include-user-harness` | `false` | Pass `--scope user` |
| `include-system-harness` | `false` | Pass `--scope system` |
| `gate` | `maturity` | Pass `--gate` |
| `config` | `''` | Pass `--config` when set |
| `min-level` | `0` | Fail when gated score is below level |

Outputs: `level`, `level-name`, `percent` (maturity); `effective-level`, `effective-percent`.

## Report JSON fields (stable)

| Field | Description |
|---|---|
| `root` | Absolute scan root |
| `scopes.maturity` | Always `["repo"]` |
| `scopes.effective` | e.g. `["repo"]`, `["repo","user"]` |
| `gate` | `"maturity"` or `"effective"` |
| `resolvedRoots` | Optional list of `{ scope, absPath }` for overlays |
| `level`, `score`, `dimensions`, `checks` | **Maturity** snapshot |
| `effective` | Same shape: `{ level, score, dimensions, checks, detectedHarnesses }` |
| `detectedHarnesses` | Tools seen in **repo** (informational) |
| `truncated` | Walk hit file cap |

`--diff` compares **maturity** fields by default (top-level `level` / `score` / `checks`).
