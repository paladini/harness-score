# Metrics & Codes संदर्भ

`harness-score` जो कुछ भी रिपोर्ट करता है उसका संक्षिप्त संदर्भ: scores, scopes,
levels, dimensions, check IDs, configuration keys, CLI flags, Action inputs,
और JSON fields। Remediation recipes
[अध्याय 8 — मापन और सुधार](./measure-and-improve#the-check-catalog) में हैं।

## स्कोर: maturity vs effective {#scores-maturity-vs-effective}

| Code | क्या शामिल है | उपयोग |
|---|---|---|
| **maturity** | केवल repository files (`scopes: repo`) | Default CI gate, badge, `--min-level`, official team maturity |
| **effective** | Repo ∪ configured global/extra scopes | Local: “इस मशीन पर agent को क्या दिखता है” जब user/system harness enabled हो |

जब कोई extra scope configured नहीं, `effective` `maturity` के बराबर (same level,
score, और checks)। Report हमेशा stable JSON के लिए दोनों blocks शामिल करता है।

CI में कौन-सा score gate करे, `gate` config में, `--gate`, या Action `gate`
input से set करें (`maturity` default)।

## स्कोप {#scopes}

| Scope | अर्थ | क्या scan होता है |
|---|---|---|
| `repo` | हमेशा on | वह directory जो आप `harness-score` को pass करते हैं (default `.`) |
| `user` | Opt-in | Allowlisted paths repo-relative shapes में map: `~/.cursor/*`, `~/.claude/*`, `~/.codeium/windsurf/*` (Windsurf alias), `~/Documents/Cline/Rules` → `.clinerules/`, `~/.continue/{rules,prompts}`, `~/.agents/*`, `~/.zed/commands`, `~/.config/opencode/agents`, आदि। [multi-harness — user scope by tool](./multi-harness#user-scope-by-tool) देखें। **शामिल नहीं:** Copilot global (repo-only), Continue inline rules in `config.yaml`, IDE-only Cursor User Rules। |
| `system` | Opt-in | Validated system-wide installs के लिए reserved (v1 में minimal) |
| `extraRoots` | Opt-in | Additional directories (relative या absolute) जिनकी tree harness layout mirror करती है — जैसे shared team harness checkout |

Conflict पर project files overlay paths पर **जीत**ती हैं (same relative path)।

**Scan नहीं:** Cursor User Rules जो केवल IDE UI में हैं (disk पर नहीं),
arbitrary home-directory walks, या evidence strings में secrets content।

## स्तर (L0–L4)

Official level names **maturity** पर लागू, जब तक `gate: effective` set न करें।

| Level | Name | Requirements (सभी पिछले levels +) |
|---|---|---|
| L0 | Unharnessed | — |
| L1 | Documented | context ≥ 40% |
| L2 | Guided | context ≥ 60%; skills ≥ 30% **या** hooks ≥ 30%; hygiene ≥ 50% |
| L3 | Sensing | sensors ≥ 60%; ci ≥ 50% |
| L4 | Self-correcting | hooks ≥ 70%; total ≥ 80% |

पूरी narrative: [परिपक्वता मॉडल](./maturity-model)।

## आयाम

| ID | Title | Max pts | Measures |
|---|---|---|---|
| `context` | Context & Guides | 20 | AGENTS.md, scoped rules, README |
| `skills` | Skills & Commands | 17 | Skills, commands/workflows, subagents |
| `hooks` | Hooks & Guardrails | 14 | hooks.json / Claude settings hooks |
| `sensors` | Sensors & Feedback | 20 | Tests, linter, types, formatter |
| `ci` | CI Feedback | 14 | Pipeline, pre-commit |
| `hygiene` | Hygiene & Safety | 23 | .gitignore, secrets, lockfile, license, MCP hygiene |

**Total:** 108 points।

## check कैटलॉग

Stable IDs — remediation से linked [मापन और सुधार](./measure-and-improve#the-check-catalog) में।

### Context & Guides

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| CTX-01 | 4 | Root `AGENTS.md`, `CLAUDE.md`, या `GEMINI.md` exists | [ctx-01](./measure-and-improve#ctx-01) |
| CTX-02 | 3 | Context file में ≥20 meaningful lines और ≥2 headings | [ctx-02](./measure-and-improve#ctx-02) |
| CTX-03 | 4 | कम से कम एक scoped rule file (कोई supported tool) या nested context file | [ctx-03](./measure-and-improve#ctx-03) |
| CTX-04 | 3 | हर rule frontmatter में activation metadata declare करती है | [ctx-04](./measure-and-improve#ctx-04) |
| CTX-05 | 2 | हर rule blanket always-on नहीं | [ctx-05](./measure-and-improve#ctx-05) |
| CTX-06 | 2 | कोई single rule file 500 lines से अधिक नहीं | [ctx-06](./measure-and-improve#ctx-06) |
| CTX-07 | 1 | Repository root पर `README.md` | [ctx-07](./measure-and-improve#ctx-07) |
| CTX-08 | 1 | Modern scoped rules के बिना legacy `.cursorrules` नहीं | [ctx-08](./measure-and-improve#ctx-08) |

### Skills & Commands

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| SKL-01 | 4 | Recognized skills directory के तहत कम से कम एक `SKILL.md` | [skl-01](./measure-and-improve#skl-01) |
| SKL-02 | 3 | हर skill के frontmatter में `name:` और `description:` | [skl-02](./measure-and-improve#skl-02) |
| SKL-03 | 3 | किसी supported tool के लिए command/workflow files exist | [skl-03](./measure-and-improve#skl-03) |
| SKL-04 | 2 | Skill descriptions ≥40 characters | [skl-04](./measure-and-improve#skl-04) |
| AGT-01 | 3 | कम से कम एक subagent markdown file | [agt-01](./measure-and-improve#agt-01) |
| AGT-02 | 2 | हर subagent में `name:` और `description:` frontmatter | [agt-02](./measure-and-improve#agt-02) |

### Hooks & Guardrails

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| HKS-01 | 4 | Hooks config exists और JSON के रूप में parse होता है | [hks-01](./measure-and-improve#hks-01) |
| HKS-02 | 2 | Events और typed handlers structurally valid हैं; unknown valid event warning देता है | [hks-02](./measure-and-improve#hks-02) |
| HKS-03 | 4 | Gate-class hook registered (shell/MCP/read/tool gate) | [hks-03](./measure-and-improve#hks-03) |
| HKS-04 | 2 | Feedback-class hook registered (post-edit/tool) | [hks-04](./measure-and-improve#hks-04) |
| HKS-05 | 2 | Executables और args का हर local path exists; non-command handlers N/A हैं | [hks-05](./measure-and-improve#hks-05) |

### Sensors & Feedback

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| SNS-01 | 6 | Test runner configured (`package.json` script, pytest, go test, etc.) | [sns-01](./measure-and-improve#sns-01) |
| SNS-02 | 5 | Linter configured (eslint, biome, ruff, golangci-lint, …) | [sns-02](./measure-and-improve#sns-02) |
| SNS-03 | 4 | Type checking configured (tsconfig, mypy, pyright, …) | [sns-03](./measure-and-improve#sns-03) |
| SNS-04 | 3 | Formatter configured (prettier, black, gofmt, …) | [sns-04](./measure-and-improve#sns-04) |
| SNS-05 | 2 | Tree में कम से कम एक test file exists | [sns-05](./measure-and-improve#sns-05) |

### CI Feedback

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| CI-01 | 4 | CI pipeline file present (GitHub Actions, GitLab CI, …) | [ci-01](./measure-and-improve#ci-01) |
| CI-02 | 4 | CI test suite चलाता है | [ci-02](./measure-and-improve#ci-02) |
| CI-03 | 3 | CI lint या typecheck चलाता है | [ci-03](./measure-and-improve#ci-03) |
| CI-04 | 3 | Pre-commit या git hook tooling installed | [ci-04](./measure-and-improve#ci-04) |

### Hygiene & Safety

| ID | Pts | Analyzes exactly | Remediation |
|---|---|---|---|
| HYG-01 | 2 | `.gitignore` present | [hyg-01](./measure-and-improve#hyg-01) |
| HYG-02 | 3 | `.gitignore` environment files cover करता है | [hyg-02](./measure-and-improve#hyg-02) |
| HYG-03 | 4 | Unprotected `.env` files नहीं (`.env.example` pattern के बिना) | [hyg-03](./measure-and-improve#hyg-03) |
| HYG-04 | 4 | MCP JSON configs में inline credential patterns नहीं | [hyg-04](./measure-and-improve#hyg-04) |
| HYG-05 | 2 | `LICENSE` file present | [hyg-05](./measure-and-improve#hyg-05) |
| HYG-06 | 2 | Harness markdown/JSON में credential-like signatures नहीं | [hyg-06](./measure-and-improve#hyg-06) |
| HYG-07 | 3 | Dependency lockfile committed | [hyg-07](./measure-and-improve#hyg-07) |
| HYG-08 | 3 | MCP configs secrets के लिए env interpolation use करते हैं | [hyg-08](./measure-and-improve#hyg-08) |

## कॉन्फ़िगरेशन फ़ाइल (`.harness-score.json`) {#configuration-file-harness-scorejson}

Scan root पर optional JSON (strict schema — unknown keys error):

```json
{
  "scopes": {
    "user": false,
    "system": false
  },
  "extraRoots": [
    { "id": "team-shared", "path": "../shared-harness" }
  ],
  "gate": "maturity",
  "extends": ["no-hooks"],
  "rules": {
    "HYG-05": "off"
  }
}
```

| Key | Type | Default | Meaning |
|---|---|---|---|
| `scopes.user` | boolean | `false` | User-level harness overlay include करें |
| `scopes.system` | boolean | `false` | System-level overlay include करें |
| `extraRoots` | `{ id, path }[]` | `[]` | Effective में merge होने वाली extra harness trees |
| `gate` | `"maturity"` \| `"effective"` | `"maturity"` | `--min-level` कौन-सा score use करता है |
| `extends` | `string[]` | `[]` | Apply करने के लिए named presets (नीचे देखें) |
| `rules` | `Record<checkId, severity>` | `{}` | Per-check severity override, `extends` के हर preset के बाद apply होता है |

Precedence: **CLI flags → Action inputs → config file → defaults**। `extends`/`rules` इस release में सिर्फ config-file तक सीमित हैं — अभी कोई `--extends`/`--rule` CLI flag या equivalent Action input नहीं है; इन्हें set करने वाली `.harness-score.json` की ओर point करने के लिए `--config <path>` use करें।

### Team customization: `extends` और `rules` {#team-customization}

यह vocabulary सीधे ESLint से लिया गया है, क्योंकि ज़्यादातर teams इसे पहले से जानती हैं:

- **`rules`** किसी single check की severity को ID से override करता है: `"HYG-05": "off"`। इस release में severity `"off"` या `"error"` — `"error"` हर check का implicit default, और `"off"` check को उसकी dimension के score के **numerator और denominator दोनों** से हटा देता है (structurally excluded, कभी fail नहीं गिना जाता)। `"warn"` एक recognized पर आज जानबूझकर rejected value है, साफ़ "not supported yet" error के साथ — future advisory, non-blocking mode के लिए reserved।
- **`extends`** maintainers द्वारा curate किया named preset apply करता है — `rules` overrides का versioned, PR-reviewed bundle, free-form per-repo exception नहीं। यह वही governance बनाए रखता है जो checks catalog को पहले से protect करती है: नया preset propose करना review से गुज़रता है ([CONTRIBUTING.md](https://github.com/paladini/harness-score/blob/main/CONTRIBUTING.md#proposing-a-preset) देखें), silent local opt-out नहीं। `extends` में presets array क्रम में apply होते हैं, और `rules` की कोई explicit entry हमेशा preset पर prevail करती है।

`extends`/`rules` द्वारा excluded हर check हमेशा disclose होता है — terminal output में (`Preset: ...` line), Markdown report में (`**Preset:**` line और checks table में `➖` status), और `--json` के `preset` field में — कभी किसी flag के पीछे silently छुपा नहीं।

एक अपवाद, जानबूझकर: `HYG-03`, `HYG-04`, और `HYG-06` — वे checks जो actively leaked या exposed credentials detect करते हैं — इन्हें `rules` या preset, किसी से भी कभी `"off"` set नहीं किया जा सकता। इस config format में बाकी सब कुछ disclosure और PR review पर integrity के लिए निर्भर है; ये तीन ही एकमात्र non-negotiable बिंदु हैं।

#### Built-in presets

| Preset | प्रभाव | क्यों |
|---|---|---|
| `no-hooks` {#preset-no-hooks} | `HKS-01`–`HKS-05` (पूरी Hooks & Guardrails dimension, 108 में से 14 points) को `"off"` set करता है | उन environments के लिए जहाँ local hook script execution policy से disallowed है — locked-down dev containers, regulated orgs, hooks install करने की permission-रहित shared runners। इन cases में guardrail केवल CI में लागू होता है। |

पूरी dimension exclude करने का एक ईमानदार परिणाम है, जो पहले से जानना उपयोगी: चूंकि **L4 · Self-correcting** runtime guardrail hooks से *defined* है (देखें [Maturity Model](./maturity-model)), `no-hooks` preset वाली repository कभी L4 तक नहीं पहुँचती — level **capped** बन जाता है, "fail" नहीं। `report.level.capped` `true` होता है और `report.level.capReason` वजह बताता है; बाकी हर dimension का score पूरी तरह अप्रभावित रहता है। यह scanner का "self-correcting" के अर्थ पर ईमानदार बने रहना है, hooks exclude करने की सज़ा नहीं।

## CLI flags (स्कैन कॉन्फ़िगरेशन)

Repository maturity discovery पर production depth cap नहीं है। Known dependency
और generated directories को छोड़ने के बाद इसमें tracked, untracked, और ignored
files शामिल होते हैं। Repository scan में `file-count-limit` emergency
1,000,000-file fuse को दर्शाता है; bounded user और extra-root overlays अभी भी
`depth-limit` report कर सकते हैं। Check के request करने पर inspect न हो पाने वाला
discovered path `unreadable-path` report करता है; जानबूझकर skip किए गए 512 KiB से
बड़े bodies यह reason report नहीं करते। Internal symlinks follow और deduplicate
होते हैं; scan root के बाहर का target `outside-root-symlink` report करता है और
उसे traverse या read नहीं किया जाता।

| Flag | Meaning |
|---|---|
| `--config <file>` | Specific path से config load करें |
| `--scope user` | User scope enable (comma-separated: `user`, `system`) |
| `--gate maturity\|effective` | `--min-level` के लिए score |
| `--min-level <0-4>` | Complete gated score level से नीचे हो तो exit 1; gate द्वारा चुना गया snapshot incomplete हो तो exit 2 |
| `--json` | Full report including `scopes`, `gate`, `effective`, और `verdicts` |

## GitHub Action इनपुट

| Input | Default | Meaning |
|---|---|---|
| `include-user-harness` | `false` | `--scope user` pass करता है |
| `include-system-harness` | `false` | `--scope system` pass करता है |
| `gate` | `maturity` | `--gate` pass करता है |
| `config` | `''` | Set होने पर `--config` pass करता है |
| `min-level` | `0` | Gated score level से नीचे हो तो fail |

Outputs: `level`, `level-name`, `percent` (maturity); `effective-level`, `effective-percent`.
Action maturity complete होने पर ही maturity outputs, badge, और report publish करती है, और effective complete होने पर ही effective outputs publish करती है। अगर केवल effective incomplete है, तो `gate: maturity` warning के साथ pass हो सकता है; `gate: effective` exit 2 देता है। Maturity incomplete होने पर maturity outputs, badge, report, या PR comment publish नहीं होते।

## Report JSON फ़ील्ड (स्थिर)

| Field | Description |
|---|---|
| `root` | Absolute scan root |
| `scopes.maturity` | हमेशा `["repo"]` |
| `scopes.effective` | जैसे `["repo"]`, `["repo","user"]` |
| `gate` | `"maturity"` या `"effective"` |
| `resolvedRoots` | Overlays के लिए optional `{ scope, absPath }` list |
| `level`, `score`, `dimensions`, `checks` | **Maturity** snapshot |
| `effective` | Same shape: `{ level, score, dimensions, checks, detectedHarnesses }` |
| `detectedHarnesses` | **Repo** में देखे गए tools (informational) |
| `verdicts.maturity`, `verdicts.effective` | हर snapshot का completeness status और deterministic reasons: `complete` या `incomplete` |
| `verdicts.*.reasons[]` | `file-count-limit`, `depth-limit`, `unreadable-directory`, `unreadable-path`, या `outside-root-symlink`, optional `path` और `limit` के साथ |
| `truncated` | Compatibility alias; maturity या effective snapshot के किसी कारण से incomplete होने पर `true` |
| `preset` | `{ extends, rules, resolved }` — इस scan में actually apply हुई team customization; `resolved` सिर्फ वे checks list करता है जिनकी severity default से अलग है |
| `level.capped`, `level.capReason` | जब अगले level की कोई blocking requirement वर्तमान config में कभी पूरी नहीं हो सकती (जैसे उसकी dimension preset से excluded), तो `capped` `true` होता है; `capReason` वजह बताता है |
| `dimensions[].applicable` | `false` सिर्फ तब जब उस dimension का हर check `"off"` resolve हुआ हो |
| `checks[].severity` | `"off"` \| `"warn"` \| `"error"` — इस scan ने उस check के लिए जो resolved severity use की |
| `checks[].warnings` | Optional non-fatal diagnostics `{ code, message, source? }`; terminal और Markdown इन्हें points बदले बिना दिखाते हैं |

`level`, `score`, dimensions, और checks diagnosis के लिए मौजूद रहते हैं, लेकिन संबंधित verdict `incomplete` होने पर provisional हैं। Terminal और Markdown unavailable snapshot को पहचानते हैं। Badge हमेशा maturity को दिखाता है और maturity incomplete होने पर `incomplete` value इस्तेमाल करता है, कभी L0-L4 नहीं। `verdicts` के बिना पुराने reports में `truncated: false` complete और `truncated: true` incomplete माना जाता है।

`--diff` default में **maturity** fields compare करता है (top-level `level` / `score` / `checks`) और incomplete maturity baseline या current result को reject करता है। Incomplete effective snapshot maturity diff को block नहीं करता।
