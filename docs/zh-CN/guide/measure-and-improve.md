# 测量与改进

本指南的一切浓缩为一条命令：

```bash
npx harness-score
```

扫描器遍历仓库（仅 filesystem — 无 LLM、无网络、无 telemetry），对任意 AI 工具运行 36 项确定性 check，报告成熟度等级及到下一级的 exact gaps：

```
  harness-score v1.0.0  /work/my-app

  Maturity: L2 · Guided   Score: 66/108 (61%)
  Detected: Cursor, Claude Code

  Context & Guides     ████████████████░░░░  80%
  Skills & Commands    █████████████░░░░░░░  67%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  ...

  To reach L3: sensors ≥ 60%; ci ≥ 50%
```

> **多工具：** 扫描器通过 OR 语义识别 Cursor、Claude Code、Windsurf、Cline、Continue 等工具的 harness artifact — 配置任一工具，Harness Score 即计数。详见 [多 harness 支持](./multi-harness)。

## 安装

```bash
npx harness-score                                       # no install
npm install -g harness-score                            # global binary
npm install --save-dev harness-score                    # pinned devDependency
```

亦镜像于 [GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
（`@paladini/harness-score`）与 [JSR](https://jsr.io/@paladini/harness-score)，供 Deno/Bun 项目使用。

## 作为库使用

CLI 是完整类型化 programmatic API 的薄包装 — 适用于 custom dashboard、bot 或任何想要 raw `Report` 而非解析终端输出的工具：

```ts
import { score } from 'harness-score';

const report = score('/path/to/repo');
console.log(report.level.name, report.score.percent, report.dimensions);
```

`Report`、`Check`、`CheckResult`、`DimensionScore`、`LevelInfo` 及所有其他 shape 以 TypeScript 声明发布 — 通过显式 `"types"` 字段解析，编辑器与 `tsc` 无需额外配置即可拾取。更低层 building blocks 亦导出，供 `score()` 未直接覆盖的场景：

```ts
import { createScanContext, buildReport, computeDiff, renderMarkdown } from 'harness-score';

const ctx = createScanContext('/path/to/repo');   // walk the filesystem once
const report = buildReport(ctx);                  // run all 36 checks against it
const markdown = renderMarkdown(report);          // same renderer the CLI's --md uses
```

## CLI 参考

```bash
harness-score [path]              # human report (default: current directory)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report (use "-" for stdout)
harness-score --badge badge.svg   # SVG pill: harness + detected level (L0–L4)
harness-score --min-level 3       # exit 1 if below L3 — the CI gate
harness-score --diff base.json    # compare against a previous --json report
```

### 随时间跟踪分数 {#diff-mode}

`--diff <file>` 将当前扫描与较早 `--json` 运行保存的 baseline report 比较 — 等级与分数 delta、各 dimension 变动、以及 exactly 哪些 check 翻转：

```bash
harness-score --json > baseline.json   # save today's report
# ...later, after changes...
harness-score --diff baseline.json     # see what moved
```

```
  Compared to baseline:
    Level: L2 · Guided → L3 · Sensing (+1)
    Score: 61/108 (56%) → 84/108 (78%) (+22pp)
    Sensors & Feedback   20% → 90% (+70pp)
    Newly passing: SNS-01, SNS-02, SNS-04, CI-01, CI-02
```

`--diff` 可与 `--json`（向 payload 添加 `current`/`baseline`/`diff`）及 `--md`（添加「Compared to baseline」节）配合 — GitHub Action 用此在 PR 上评论「harness 分数从 L2 升到 L3」。

## Cursor 插件 {#the-cursor-plugin}

从 [本仓库插件目录](https://github.com/paladini/harness-score/tree/main/plugins/cursor) 安装 **Harness Score**
（Cursor Marketplace listing 已提交待审 — 上线后此链接将移至该处），你将获得：

- **`/harness-audit`** — 在打开的工作区运行扫描器，让智能体展示 report 及主要修复方案。
- **`harness-engineering` skill** — 当你说「fix it」或「improve my harness」时，智能体知道如何按本指南方案编写缺失 artifact。

分析本身始终是确定性 CLI；模型仅展示结果并应用你要求的修复。

## CI 门禁 {#ci-gate}

Harness 会静默回归 — 有人在清理中删除 `hooks.json`、rule 文件 rot。在 CI 中 ratchet 等级：

```yaml
- name: Harness gate
  run: npx -y harness-score --min-level 3
```

或使用打包 action，亦会生成 badge：

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
    badge: 'harness-badge.svg'
```

## 展示成熟度 {#show-your-maturity}

Harness Score 提供**两种品牌 SVG 格式**，与扫描器 progress bar 同一视觉语言 — 无 shields.io、无付费服务、渲染时无网络：

| 格式 | 文件 | 显示 | 最佳用途 |
|---|---|---|---|
| **Badge** | `harness-badge.svg` 或 `badge-l0.svg` … `badge-l4.svg` | `harness` · `L4` | README 行（112×20 药丸） |
| **Share card** | `card-l0.svg` … `card-l4.svg` | 带等级名的完整 banner | 社交帖、repo hero（860×240） |

Badge 始终**仅显示等级**（`L0`–`L4`）。等级名（Unharnessed、Guided…）在 share card 与扫描器输出中。

无论 CI 重新生成或固定静态文件，药丸外观相同 — 仅 wiring 不同。

### Badge — 自动更新（推荐）

`harness-score --badge` 为扫描器检测到的等级写入 SVG。在 CI 中配置一次；README 图像随 harness 改进自动更新。

```yaml
# .github/workflows/harness.yml
name: Harness Score
on: { push: { branches: [main] } }
permissions: { contents: write }
jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score/action@main
        with: { badge: 'harness-badge.svg' }
      - uses: JamesIves/github-pages-deploy-action@v4
        with: { branch: badges, folder: ., clean: false }
```

从 README 引用已发布文件 — 完整 copy-paste 方案见 [嵌入片段](#embed-snippets)：

```md
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

在 `<img>` 上设置 `height="20"` 使药丸与同行 npm/CI shields 对齐（112×20 SVG；仅等级 — 分数百分比留在 CLI report）。

Dogfood 示例（本指南在 GitHub Pages 上的 live badge）：

<div class="hs-visual">
  <p class="hs-visual-label">Badge (this repo)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" src="/harness-badge.svg" alt="Harness Score" height="20">
  </div>
</div>

检测等级对应的 share card 发布为 `harness-card.svg`（本仓库当前为 L4）：

<img class="hs-share-card" src="/harness-card.svg" alt="Harness Score L4 · Self-correcting">

### Badge — 固定等级

同一药丸、静态文件 — 若不想 CI 重新生成图像，选 `badge-l0.svg` … `badge-l4.svg`。Markdown、HTML、iframe、JSX 等见 [嵌入片段](#embed-snippets)。

### Share card

Hero 图像或社交帖用 banner card — 含等级名（`Unharnessed`、`Guided`…）：

| Level | Badge | Share card |
|---|---|---|
| L0 · Unharnessed | [badge-l0.svg](https://paladini.github.io/harness-score/maturity/badge-l0.svg) | [card-l0.svg](https://paladini.github.io/harness-score/maturity/card-l0.svg) |
| L1 · Documented | [badge-l1.svg](https://paladini.github.io/harness-score/maturity/badge-l1.svg) | [card-l1.svg](https://paladini.github.io/harness-score/maturity/card-l1.svg) |
| L2 · Guided | [badge-l2.svg](https://paladini.github.io/harness-score/maturity/badge-l2.svg) | [card-l2.svg](https://paladini.github.io/harness-score/maturity/card-l2.svg) |
| L3 · Sensing | [badge-l3.svg](https://paladini.github.io/harness-score/maturity/badge-l3.svg) | [card-l3.svg](https://paladini.github.io/harness-score/maturity/card-l3.svg) |
| L4 · Self-correcting | [badge-l4.svg](https://paladini.github.io/harness-score/maturity/badge-l4.svg) | [card-l4.svg](https://paladini.github.io/harness-score/maturity/card-l4.svg) |

<div class="hs-visual">
  <p class="hs-visual-label">All badge levels (112×20)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" alt="L0" src="/maturity/badge-l0.svg" height="20">
    <img class="hs-badge" alt="L1" src="/maturity/badge-l1.svg" height="20">
    <img class="hs-badge" alt="L2" src="/maturity/badge-l2.svg" height="20">
    <img class="hs-badge" alt="L3" src="/maturity/badge-l3.svg" height="20">
    <img class="hs-badge" alt="L4" src="/maturity/badge-l4.svg" height="20">
  </div>
</div>

<div class="hs-visual">
  <p class="hs-visual-label">Share card example (860×240)</p>
  <img class="hs-share-card" alt="L4 · Self-correcting" src="/maturity/card-l4.svg">
  <p class="hs-visual-detail">从上方表格下载任意等级 — card 含等级名。</p>
</div>

## 嵌入片段 {#embed-snippets}

分享的 copy-paste 方案。替换占位符：

| 占位符 | 自动更新 badge | 固定 badge（等级 `{N}`） | Share card |
|---|---|---|---|
| `{BADGE_URL}` | `https://raw.githubusercontent.com/{owner}/{repo}/badges/harness-badge.svg` | `https://paladini.github.io/harness-score/maturity/badge-l{N}.svg` | — |
| `{CARD_URL}` | — | — | `https://paladini.github.io/harness-score/maturity/card-l{N}.svg` |
| `{LINK}` | 你的 repo 或 `https://paladini.github.io/harness-score/` | 同上 | 同上 |

`{N}` 为 `0`–`4`。本仓库 live badge（你的 fork 无需 CI）：
`https://raw.githubusercontent.com/paladini/harness-score/main/docs/public/harness-badge.svg`

**Badge 尺寸：** 112×20 — 始终设置 `height="20"`（或 `height={20}`）使药丸与同行 shields.io badge 对齐。

### Badge — Markdown

仅图像（GitHub、GitLab、dev.to — 若 plain `![]()` 拉伸则用 HTML）：

```md
<img alt="Harness Score L4" src="{BADGE_URL}" height="20">
```

带链接（可点击）：

```md
[![Harness Score L4]({BADGE_URL})]({LINK})
```

引用式：

```md
[![Harness Score][hs-badge]][hs-link]

[hs-badge]: {BADGE_URL}
[hs-link]: {LINK}
```

### Badge — HTML

```html
<img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
```

带链接：

```html
<a href="{LINK}">
  <img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
</a>
```

### Badge — iframe

CMS 或 wiki 仅允许 iframe（非 `<img>`）时：

```html
<iframe
  src="{BADGE_URL}"
  title="Harness Score L4"
  width="112"
  height="20"
  style="border:0;overflow:hidden"
></iframe>
```

### Badge — SVG object / embed

```html
<object data="{BADGE_URL}" type="image/svg+xml" width="112" height="20">
  <a href="{BADGE_URL}">Harness Score L4</a>
</object>
```

```html
<embed src="{BADGE_URL}" type="image/svg+xml" width="112" height="20" />
```

### Badge — JSX / React

```jsx
<a href="{LINK}">
  <img
    alt="Harness Score L4"
    src="{BADGE_URL}"
    height={20}
    width={112}
    style={{ verticalAlign: 'middle' }}
  />
</a>
```

### Badge — AsciiDoc

```asciidoc
image:{BADGE_URL}[Harness Score L4,link={LINK},height=20]
```

### Badge — BBCode (forums)

```text
[url={LINK}][img]{BADGE_URL}[/img][/url]
```

### Badge — direct URL

Paste in chat, Notion image block, Slack, Discord, or any tool that accepts a
raw image URL:

```text
{BADGE_URL}
```

### Share card — Markdown / HTML

README hero、博客或社交预览的 banner（`{N}` = `0`–`4`）：

```md
[![Harness Score L4 · Self-correcting]({CARD_URL})]({LINK})
```

```html
<a href="{LINK}">
  <img
    alt="Harness Score L4 · Self-correcting"
    src="{CARD_URL}"
    width="560"
    style="max-width:100%;height:auto;border-radius:8px"
  />
</a>
```

### Share card — iframe

```html
<iframe
  src="{CARD_URL}"
  title="Harness Score L4 · Self-correcting"
  width="560"
  height="157"
  style="border:0;max-width:100%"
></iframe>
```

### Share card — 直接 URL

```text
{CARD_URL}
```

### 示例（固定 L3 badge）

```md
<a href="https://paladini.github.io/harness-score/">
  <img alt="Harness Score L3" src="https://paladini.github.io/harness-score/maturity/badge-l3.svg" height="20">
</a>
```

```html
<iframe
  src="https://paladini.github.io/harness-score/maturity/badge-l3.svg"
  title="Harness Score L3"
  width="112"
  height="20"
  style="border:0"
></iframe>
```

> **shields.io 爱好者？** 你的 Action 也可写小 JSON 文件并指向
> [shields endpoint](https://shields.io/badges/endpoint-badge)
> （`{ "schemaVersion": 1, "label": "harness", "message": "L3", "color": "brightgreen" }`）。
> 上方品牌 SVG 自包含，无需第三方。

## Check 目录 {#the-check-catalog}

扫描器运行的每项 check 及其修复方案。Check ID 稳定；CLI 将每项失败链接到此条目。

### Context & Guides (20 pts)

#### CTX-01 · Agent context file present — 4 pts {#ctx-01}
An `AGENTS.md` (or `CLAUDE.md` / `GEMINI.md`) exists at the repository root.
**修复：** create `AGENTS.md` answering: what is this project, how do I build
and test it, what conventions hold, what must I never touch. Recipe in
[第 3 章](./guides-feedforward#writing-an-agents-md-that-works)。

#### CTX-02 · Context file is substantive — 3 pts {#ctx-02}
≥20 meaningful lines and ≥2 headings — a stub scores nothing.
**修复：** cover layout, build & test commands, conventions, and no-go zones.
Commands over descriptions; point to rules instead of pasting them.

#### CTX-03 · Scoped rules in use — 4 pts {#ctx-03}
At least one scoped rule file for any supported tool (e.g. `.cursor/rules/*.mdc`,
`.windsurf/rules/*.md`, `.clinerules/*.md`, `.continue/rules/*.md`,
`.github/instructions/*.instructions.md`, `.agents/rules/*`). Nested context
files in subdirectories (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` anywhere below
the root) also count — they are directory-scoped rules in tools like Claude
Code and Codex.
**修复：** start with one short always-on rule holding your non-negotiables,
then add path-scoped rules per area (or nested context files per subtree).

#### CTX-04 · Rules have valid frontmatter — 3 pts {#ctx-04}
Every rule declares activation metadata (`description`, `globs`/`trigger`/`paths`/`applyTo`, or `alwaysApply`).
Rules a tool auto-loads without metadata — `.continue/rules/*` and nested
context files — pass by construction.
**修复：** add the frontmatter block; without it the agent can't decide when the
rule applies.

#### CTX-05 · Rules are scoped — 2 pts {#ctx-05}
Not every rule is blanket always-on. Nested context files count as scoped —
they apply only to their subtree.
**修复：** scope rules to paths (`globs:`, `trigger:` glob, `paths:`, `applyTo:`)
so they load only when relevant — every always-on rule taxes every request's context.

#### CTX-06 · No bloated rules — 2 pts {#ctx-06}
No single rule exceeds 500 lines.
**修复：** split by concern, or move procedural content into a skill.

#### CTX-07 · README present — 1 pt {#ctx-07}
**修复：** add a README.md; it's the first orientation document for humans and
a fallback for agents.

#### CTX-08 · No legacy .cursorrules — 1 pt {#ctx-08}
The deprecated single-file format is absent (or modern scoped rules also exist).
**修复：** migrate `.cursorrules` content into scoped rules for your tool.

### Skills & Commands (17 pts)

#### SKL-01 · At least one skill — 4 pts {#skl-01}
A `SKILL.md` under `.cursor/skills/<name>/`, `.claude/skills/<name>/`, or `.agents/skills/<name>/`.
**修复：** package your most repeated procedure (deploy, release, migration)
as a skill — [第 3 章](./guides-feedforward#skills-the-procedural-layer)。

#### SKL-02 · Skills declare name and description — 3 pts {#skl-02}
Frontmatter with `name:` and `description:` on every skill.
**修复：** the agent decides whether to load a skill from these two fields
alone; without them the skill is invisible.

#### SKL-03 · Explicit workflows/commands defined — 3 pts {#skl-03}
Command or workflow files (`.cursor/commands/`, `.windsurf/workflows/`,
`.claude/commands/`, `.continue/prompts/`, `.zed/commands/`, `.agents/workflows/`).
**修复：** encode workflows you trigger deliberately (`/review`, `/release`)
as command/workflow files.

#### SKL-04 · Skill descriptions are trigger-worthy — 2 pts {#skl-04}
Descriptions ≥40 characters.
**修复：** write descriptions as trigger conditions — "Use when the user asks
to deploy or release; covers tagging, pipeline, rollback, smoke tests."

#### AGT-01 · Custom subagent defined — 3 pts {#agt-01}
A subagent file under `.cursor/agents/`, `.claude/agents/`, or `.opencode/agents/`.
**修复：** package a purpose-built subagent for a job the primary agent should
delegate (planning, review, release) — see
[Subagents](./cursor-harness-surface#subagents-purpose-built-delegates)
第 2 章。

#### AGT-02 · Subagents declare name and description — 2 pts {#agt-02}
Frontmatter with `name:` and `description:` on every subagent definition.
**修复：** the parent agent decides whether to delegate from these two fields
alone; without them the subagent is never invoked.

### Hooks & Guardrails (14 pts)

#### HKS-01 · Hooks configuration present and valid — 4 pts {#hks-01}
`.cursor/hooks.json` or `.claude/settings.json` (`hooks` key) exists and parses as JSON.
**修复：** create hooks config and grow from the
recipes in [第 5 章](./guardrails-and-safety#gate-hooks)。

#### HKS-02 · Known events, version declared — 2 pts {#hks-02}
Version/metadata present; every registered event is documented for your tool
(Cursor lifecycle events, or Claude Code `PreToolUse`/`PostToolUse`).
**修复：** typo'd event names fail silently — check against the event list in
[第 2 章](./cursor-harness-surface#hooks-observe-and-control-the-agent-loop)。

#### HKS-03 · Gate hook guards risky operations — 4 pts {#hks-03}
A gate hook registered (Cursor: `beforeShellExecution`, `beforeMCPExecution`,
`preToolUse`, or `beforeReadFile`; Claude Code: `PreToolUse`).
**修复：** 添加第 5 章的 destructive-command deny gate — prose rules 是请求；gates 是事实。

#### HKS-04 · Feedback hook observes output — 2 pts {#hks-04}
A feedback hook registered (Cursor: `afterFileEdit`, `postToolUse`, …;
Claude Code: `PostToolUse`).
**修复：** format-and-lint on edit gives the agent instant feedback inside the
session.

#### HKS-05 · Hook scripts committed — 2 pts {#hks-05}
Scripts referenced by the hooks config exist in the repository.
**修复：** commit them; a hook pointing at a missing script fails open on
every machine but the author's.

### Sensors & Feedback (20 pts)

#### SNS-01 · Test runner configured — 6 pts {#sns-01}
A real test script/config (vitest, jest, pytest, go test, cargo test…).
**修复：** wire up the runner with one obvious entry point and document it in
AGENTS.md — tests are how the agent verifies its own work.

#### SNS-02 · Linter configured — 5 pts {#sns-02}
eslint/biome, ruff, golangci-lint, rubocop, or equivalent.
**修复：** every convention expressible as a lint rule stops needing prose.

#### SNS-03 · Type checking in place — 4 pts {#sns-03}
tsconfig (ideally `strict: true`), mypy/pyright, or a statically typed
language.
**修复：** the type checker is the only sensor that reviews every agent edit
for free — [第 4 章](./sensors-feedback#type-checking-the-free-sensor)。

#### SNS-04 · Formatter configured — 3 pts {#sns-04}
prettier/biome, black/ruff-format, gofmt/rustfmt.
**修复：** formatting noise in diffs hides real mistakes from review.

#### SNS-05 · Test files exist — 2 pts {#sns-05}
At least one actual test file in the tree.
**修复：** a configured runner with zero tests is a green light nobody earned.

### CI Feedback (14 pts)

#### CI-01 · CI pipeline configured — 4 pts {#ci-01}
GitHub Actions workflow (or GitLab/CircleCI/Jenkins equivalent).
**修复：** add `.github/workflows/ci.yml` running your sensors on every push.

#### CI-02 · CI runs the tests — 4 pts {#ci-02}
**修复：** no agent-authored change should be mergeable without the suite
firing.

#### CI-03 · CI runs lint/typecheck — 3 pts {#ci-03}
**修复：** cheap computational sensors belong on every push — keep quality
left.

#### CI-04 · Pre-commit checks installed — 3 pts {#ci-04}
husky/lint-staged, `pre-commit`, or lefthook.
**修复：** the earliest feedback a commit can get; catches what on-edit hooks
missed before it enters history.

### Hygiene & Safety (23 pts)

#### HYG-01 · .gitignore present — 2 pts {#hyg-01}
**修复：** agents commit what they see; make build output and local state
invisible.

#### HYG-02 · .gitignore covers env files — 3 pts {#hyg-02}
A `.env` pattern in .gitignore.
**修复：** add `.env` and `.env.*` (allow `!.env.example`) — the cheapest
guardrail in existence.

#### HYG-03 · No unprotected .env files — 4 pts {#hyg-03}
No real env files in the tree unless gitignored (templates are fine).
**修复：** move secrets out; keep `.env.example` documenting required
variables.

#### HYG-04 · MCP config free of credentials — 4 pts {#hyg-04}
No credential signatures in MCP config (`.cursor/mcp.json`, `.mcp.json`,
`.agents/mcp_config.json`).
**修复：** use `${ENV_VAR}` interpolation — an inlined key in MCP config is a
secret published to every clone.

#### HYG-05 · License present — 2 pts {#hyg-05}
**修复：** add a LICENSE; required for open-source use and plugin marketplaces.

#### HYG-06 · No secrets in harness files — 2 pts {#hyg-06}
AGENTS.md, rules, and hooks config are clean of token signatures.
**修复：** these files are loaded into model context every session — a key
there is exfiltrated by design.

#### HYG-07 · Lockfile committed — 3 pts {#hyg-07}
package-lock.json, uv.lock, Cargo.lock, go.sum, or equivalent.
**修复：** reproducible installs mean your sensors test the same dependency
tree everywhere.

#### HYG-08 · MCP config uses env interpolation for credentials — 3 pts {#hyg-08}
An MCP config file is valid, and any credential-shaped field (token, key,
secret, password…) uses `${ENV_VAR}` interpolation rather than a literal.
The positive complement to HYG-04 — a repo with no MCP setup earns nothing
here, same as any other bonus check.
**修复：** reference secrets as `"${VAR_NAME}"` and document required
variables in `.env.example`.

## 实践改进计划

从典型 L0 product repo 出发，每级一次 focused session：

1. **→ L1（一个下午）。** 写 `AGENTS.md`（CTX-01/02）。即使 sensors 弱也包含 build/test 命令 — 智能体会用。
2. **→ L2（一天）。** 三条 scoped rules + 一个最常重复程序的 skill（CTX-03…06、SKL-01/02）。修复 hygiene：gitignore、env files、license（HYG-01…05）。
3. **→ L3（若缺 sensors 则是真功夫）。** Test runner + linter + strict types + 运行三者的 `ci.yml`（SNS-*、CI-01…03）。若已有，此级免费。
4. **→ L4（一个上午）。** 第 5 章两个 hooks — 一个 gate、一个 formatter — 与 scripts 一起提交（HKS-*）、pre-commit（CI-04），然后 CI 中 `--min-level 4` 使其永不回归。
