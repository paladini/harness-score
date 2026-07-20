# 测量与改进

本指南的一切浓缩为一条命令：

```bash
npx harness-score
```

扫描器遍历你的仓库（仅读取文件系统 — 无 LLM、无网络、无遥测），对任意 AI 工具运行 36 项确定性检查，报告成熟度等级及距下一级的精确差距：

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

> **多工具：** 扫描器通过 OR 语义识别 Cursor、Claude Code、Windsurf、Cline、Continue 等工具的 harness 产物 — 配置任一工具即计入 Harness Score。详见 [多 harness 支持](./multi-harness)。

## 安装

```bash
npx harness-score                                       # no install
npm install -g harness-score                            # global binary
npm install --save-dev harness-score                    # pinned devDependency
```

亦镜像于 [GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
（`@paladini/harness-score`）与 [JSR](https://jsr.io/@paladini/harness-score)，
供 Deno/Bun 项目使用。

## 作为库使用

CLI 是完整类型化编程 API 的薄包装 — 适用于自定义仪表盘、机器人，或任何需要原始 `Report` 而非解析终端输出的工具：

```ts
import { score } from 'harness-score';

const report = score('/path/to/repo');
console.log(report.level.name, report.score.percent, report.dimensions);
```

`Report`、`Check`、`CheckResult`、`DimensionScore`、`LevelInfo` 及所有其他类型均以 TypeScript 声明导出 — 通过显式 `"types"` 字段解析，编辑器与 `tsc` 无需额外配置即可识别。更低层构建块同样导出，供 `score()` 未直接覆盖的场景使用：

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

`--diff <file>` 将当前扫描与较早一次 `--json` 运行保存的基线报告对比 — 等级与分数的增量、各维度变动，以及具体哪些检查项发生了变化：

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

`--diff` 可与 `--json`（向 payload 添加 `current`/`baseline`/`diff`）及 `--md`（添加「Compared to baseline」章节）配合使用 — GitHub Action 借此在 PR 上评论「harness 分数从 L2 升到 L3」。

## Cursor 插件 {#the-cursor-plugin}

从 [本仓库的插件目录](https://github.com/paladini/harness-score/tree/main/plugins/cursor) 安装 **Harness Score**
（Cursor Marketplace 上架申请已提交、待审核 — 上线后此链接将移至该处），你将获得：

- **`/harness-audit`** — 在打开的工作区运行扫描器，让智能体展示报告及主要修复建议。
- **`harness-engineering` skill** — 当你说「修一下」或「改进我的 harness」时，智能体知道如何按本指南的方案编写缺失产物。

分析本身始终是确定性 CLI；模型只负责展示结果，并按你的要求应用修复。

## CI 门禁 {#ci-gate}

Harness 会静默退化 — 有人在清理时删掉 `hooks.json`，规则文件任其腐烂。在 CI 中锁定等级：

```yaml
- name: Harness gate
  run: npx -y harness-score --min-level 3
```

或使用打包 action，同时生成徽章：

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
    badge: 'harness-badge.svg'
```

## 展示成熟度 {#show-your-maturity}

Harness Score 提供**两种品牌 SVG 格式**，与扫描器进度条同一视觉语言 — 不依赖 shields.io、无需付费服务、渲染时无需联网：

| 格式 | 文件 | 显示内容 | 最佳用途 |
|---|---|---|---|
| **徽章** | `harness-badge.svg` 或 `badge-l0.svg` … `badge-l4.svg` | `harness` · `L4` | README 行（112×20 胶囊形徽章） |
| **分享卡片** | `card-l0.svg` … `card-l4.svg` | 带等级名称的完整横幅 | 社交帖、仓库头图（860×240） |

徽章始终**仅显示等级**（`L0`–`L4`）。等级名称
（Unharnessed、Guided…）出现在分享卡片与扫描器输出中。

无论 CI 重新生成还是固定静态文件，胶囊形徽章外观相同 — 只是接入方式不同。

### 徽章 — 自动更新（推荐）

`harness-score --badge` 为扫描器检测到的等级写入 SVG。
在 CI 中配置一次；README 中的图片会随 harness 改进自动更新。

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

在 README 中引用已发布文件 — 完整复制粘贴方案见
[嵌入片段](#embed-snippets)：

```md
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

在 `<img>` 上设置 `height="20"`，使胶囊形徽章与同行的 npm/CI shields 对齐
（112×20 SVG；仅显示等级 — 分数百分比留在 CLI 报告中）。

本仓库自举示例（本指南在 GitHub Pages 上的实时徽章）：

<div class="hs-visual">
  <p class="hs-visual-label">Badge (this repo)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" src="/harness-badge.svg" alt="Harness Score" height="20">
  </div>
</div>

与检测等级匹配的分享卡片发布为
`harness-card.svg`（本仓库当前为 L4）：

<img class="hs-share-card" src="/harness-card.svg" alt="Harness Score L4 · Self-correcting">

### 徽章 — 固定等级

同一胶囊形徽章、静态文件 — 若不想由 CI 重新生成图片，选用 `badge-l0.svg` … `badge-l4.svg`。
Markdown、HTML、iframe、JSX 等用法见 [嵌入片段](#embed-snippets)。

### 分享卡片

用作头图或社交帖时，使用横幅式分享卡片 — 包含等级名称
（`Unharnessed`、`Guided`…）：

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
  <p class="hs-visual-detail">从上方表格下载任意等级 — 分享卡片包含等级名称。</p>
</div>

## 嵌入片段 {#embed-snippets}

复制粘贴即可分享的方案。替换占位符：

| 占位符 | 自动更新徽章 | 固定徽章（等级 `{N}`） | 分享卡片 |
|---|---|---|---|
| `{BADGE_URL}` | `https://raw.githubusercontent.com/{owner}/{repo}/badges/harness-badge.svg` | `https://paladini.github.io/harness-score/maturity/badge-l{N}.svg` | — |
| `{CARD_URL}` | — | — | `https://paladini.github.io/harness-score/maturity/card-l{N}.svg` |
| `{LINK}` | 你的仓库或 `https://paladini.github.io/harness-score/` | 同上 | 同上 |

`{N}` 为 `0`–`4`。本仓库的实时徽章（你的 fork 无需 CI）：
`https://raw.githubusercontent.com/paladini/harness-score/main/docs/public/harness-badge.svg`

**徽章尺寸：** 112×20 — 始终设置 `height="20"`（或 `height={20}`），使胶囊形徽章与同行的 shields.io 徽章对齐。

### 徽章 — Markdown

仅图片（GitHub、GitLab、dev.to — 若纯 `![]()` 会被拉伸，请用 HTML）：

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

### 徽章 — HTML

```html
<img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
```

带链接：

```html
<a href="{LINK}">
  <img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
</a>
```

### 徽章 — iframe

适用于仅允许 iframe、不允许 `<img>` 的 CMS 或 wiki：

```html
<iframe
  src="{BADGE_URL}"
  title="Harness Score L4"
  width="112"
  height="20"
  style="border:0;overflow:hidden"
></iframe>
```

### 徽章 — SVG object / embed

```html
<object data="{BADGE_URL}" type="image/svg+xml" width="112" height="20">
  <a href="{BADGE_URL}">Harness Score L4</a>
</object>
```

```html
<embed src="{BADGE_URL}" type="image/svg+xml" width="112" height="20" />
```

### 徽章 — JSX / React

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

### 徽章 — AsciiDoc

```asciidoc
image:{BADGE_URL}[Harness Score L4,link={LINK},height=20]
```

### 徽章 — BBCode（论坛）

```text
[url={LINK}][img]{BADGE_URL}[/img][/url]
```

### 徽章 — 直接 URL

粘贴到聊天、Notion 图片块、Slack、Discord，或任何接受原始图片 URL 的工具：

```text
{BADGE_URL}
```

### 分享卡片 — Markdown / HTML

用于 README 头图、博客或社交预览的横幅（`{N}` = `0`–`4`）：

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

### 分享卡片 — iframe

```html
<iframe
  src="{CARD_URL}"
  title="Harness Score L4 · Self-correcting"
  width="560"
  height="157"
  style="border:0;max-width:100%"
></iframe>
```

### 分享卡片 — 直接 URL

```text
{CARD_URL}
```

### 完整示例（固定 L3 徽章）

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

> **shields.io 爱好者？** 你的 Action 也可以写入一个小 JSON 文件，并指向
> [shields endpoint](https://shields.io/badges/endpoint-badge)
> （`{ "schemaVersion": 1, "label": "harness", "message": "L3", "color": "brightgreen" }`）。
> 上方的品牌 SVG 自包含，无需第三方。

## 检查目录 {#the-check-catalog}

扫描器运行的每一项检查及其修复方案。检查 ID 稳定；CLI 将每项失败链接到此条目。

### Context & Guides (20 pts)

#### CTX-01 · Agent context file present — 4 pts {#ctx-01}
仓库根目录存在 `AGENTS.md`（或 `CLAUDE.md` / `GEMINI.md`）。
**修复：** 创建 `AGENTS.md`，回答：项目是什么、如何构建与测试、有哪些约定、哪些地方绝对不能动。方案见
[第 3 章](./guides-feedforward#writing-an-agents-md-that-works)。

#### CTX-02 · Context file is substantive — 3 pts {#ctx-02}
≥20 行有意义的内容且 ≥2 个标题 — 占位内容不得分。
**修复：** 涵盖目录结构、构建与测试命令、约定、禁止区域。
优先写命令而非描述；指向 rules 而非粘贴全文。

#### CTX-03 · Scoped rules in use — 4 pts {#ctx-03}
任意受支持工具至少有一条 scoped rule 文件（如 `.cursor/rules/*.mdc`、
`.windsurf/rules/*.md`、`.clinerules/*.md`、`.continue/rules/*.md`、
`.github/instructions/*.instructions.md`、`.agents/rules/*`）。子目录中的嵌套 context
文件（根目录以下的 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`）同样计入 — 在 Claude
Code、Codex 等工具中，它们相当于目录级 rules。
**修复：** 先写一条简短的 always-on rule 承载不可妥协的底线，
再按区域添加 path-scoped rules（或按子树添加嵌套 context 文件）。

#### CTX-04 · Rules have valid frontmatter — 3 pts {#ctx-04}
每条 rule 都声明激活元数据（`description`、`globs`/`trigger`/`paths`/`applyTo`，或 `alwaysApply`）。
工具无需元数据即自动加载的 rules — `.continue/rules/*` 与嵌套
context 文件 — 按设计即通过。
**修复：** 添加 frontmatter 块；没有它，智能体无法判断 rule 何时生效。

#### CTX-05 · Rules are scoped — 2 pts {#ctx-05}
并非每条 rule 都是全局 always-on。嵌套 context 文件视为 scoped —
仅作用于其所在子树。
**修复：** 将 rules 限定到路径（`globs:`、`trigger:` glob、`paths:`、`applyTo:`），
仅在相关时加载 — 每条 always-on rule 都会占用每次请求的 context。

#### CTX-06 · No bloated rules — 2 pts {#ctx-06}
单条 rule 不超过 500 行。
**修复：** 按关注点拆分，或将流程性内容移入 skill。

#### CTX-07 · README present — 1 pt {#ctx-07}
**修复：** 添加 README.md；它是人类的首要导向文档，也是智能体的后备参考。

#### CTX-08 · No legacy .cursorrules — 1 pt {#ctx-08}
已弃用的单文件格式不存在（或另有现代 scoped rules）。
**修复：** 将 `.cursorrules` 内容迁移到对应工具的 scoped rules。

### Skills & Commands (17 pts)

#### SKL-01 · At least one skill — 4 pts {#skl-01}
`.cursor/skills/<name>/`、`.claude/skills/<name>/` 或 `.agents/skills/<name>/` 下存在 `SKILL.md`。
**修复：** 将最常重复的流程（部署、发布、迁移）
封装为 skill — [第 3 章](./guides-feedforward#skills-the-procedural-layer)。

#### SKL-02 · Skills declare name and description — 3 pts {#skl-02}
每条 skill 的 frontmatter 含 `name:` 与 `description:`。
**修复：** 智能体仅凭这两个字段决定是否加载 skill；
缺少它们，skill 等于不可见。

#### SKL-03 · Explicit workflows/commands defined — 3 pts {#skl-03}
存在 command 或 workflow 文件（`.cursor/commands/`、`.windsurf/workflows/`、
`.claude/commands/`、`.continue/prompts/`、`.zed/commands/`、`.agents/workflows/`）。
**修复：** 将你有意触发的 workflow（`/review`、`/release`）
编码为 command/workflow 文件。

#### SKL-04 · Skill descriptions are trigger-worthy — 2 pts {#skl-04}
description ≥40 字符。
**修复：** 将 description 写成触发条件 — 「当用户要求部署或发布时使用；涵盖打 tag、流水线、回滚、冒烟测试。」

#### AGT-01 · Custom subagent defined — 3 pts {#agt-01}
`.cursor/agents/`、`.claude/agents/` 或 `.opencode/agents/` 下存在 subagent 文件。
**修复：** 为主智能体应委派的任务（规划、审查、发布）封装专用 subagent — 见
[Subagents](./cursor-harness-surface#subagents-purpose-built-delegates)
（第 2 章）。

#### AGT-02 · Subagents declare name and description — 2 pts {#agt-02}
每条 subagent 定义的 frontmatter 含 `name:` 与 `description:`。
**修复：** 父智能体仅凭这两个字段决定是否委派；
缺少它们，subagent 永远不会被调用。

### Hooks & Guardrails (14 pts)

#### HKS-01 · Hooks configuration present and valid — 4 pts {#hks-01}
`.cursor/hooks.json` 或 `.claude/settings.json`（`hooks` 键）存在且可解析为 JSON。
**修复：** 创建 hooks 配置，并按
[第 5 章](./guardrails-and-safety#gate-hooks) 的方案逐步扩展。

#### HKS-02 · Known events, version declared — 2 pts {#hks-02}
存在 version/元数据；每个注册事件在对应工具中有文档
（Cursor 生命周期事件，或 Claude Code 的 `PreToolUse`/`PostToolUse`）。
**修复：** 拼错的事件名会静默失败 — 对照
[第 2 章](./cursor-harness-surface#hooks-observe-and-control-the-agent-loop) 的事件列表检查。

#### HKS-03 · Gate hook guards risky operations — 4 pts {#hks-03}
已注册 gate hook（Cursor：`beforeShellExecution`、`beforeMCPExecution`、
`preToolUse` 或 `beforeReadFile`；Claude Code：`PreToolUse`）。
**修复：** 添加第 5 章的 destructive-command deny gate — 文字 rules 是请求；gate 是事实。

#### HKS-04 · Feedback hook observes output — 2 pts {#hks-04}
已注册 feedback hook（Cursor：`afterFileEdit`、`postToolUse` 等；
Claude Code：`PostToolUse`）。
**修复：** 编辑时 format-and-lint，让智能体在会话内获得即时反馈。

#### HKS-05 · Hook scripts committed — 2 pts {#hks-05}
hooks 配置引用的脚本存在于仓库中。
**修复：** 提交它们；指向缺失脚本的 hook 在除作者机器外的每台机器上都会失效放行（fail open）。

### Sensors & Feedback (20 pts)

#### SNS-01 · Test runner configured — 6 pts {#sns-01}
存在真实的测试脚本/配置（vitest、jest、pytest、go test、cargo test 等）。
**修复：** 配置 runner 并提供一个明确的入口，在 AGENTS.md 中记录 —
测试是智能体验证自身工作的方式。

#### SNS-02 · Linter configured — 5 pts {#sns-02}
eslint/biome、ruff、golangci-lint、rubocop 或等价工具。
**修复：** 能用 lint rule 表达的约定就不再需要文字说明。

#### SNS-03 · Type checking in place — 4 pts {#sns-03}
tsconfig（理想情况下 `strict: true`）、mypy/pyright，或静态类型语言。
**修复：** 类型检查器是唯一免费审查每次智能体编辑的传感器 —
[第 4 章](./sensors-feedback#type-checking-the-free-sensor)。

#### SNS-04 · Formatter configured — 3 pts {#sns-04}
prettier/biome、black/ruff-format、gofmt/rustfmt。
**修复：** diff 中的格式噪音会掩盖审查中的真实错误。

#### SNS-05 · Test files exist — 2 pts {#sns-05}
树中至少有一个真实测试文件。
**修复：** 配置了 runner 却没有测试，等于没人挣来的绿灯。

### CI Feedback (14 pts)

#### CI-01 · CI pipeline configured — 4 pts {#ci-01}
GitHub Actions workflow（或 GitLab/CircleCI/Jenkins 等价物）。
**修复：** 添加 `.github/workflows/ci.yml`，每次 push 运行传感器。

#### CI-02 · CI runs the tests — 4 pts {#ci-02}
**修复：** 任何由智能体编写的变更，在未跑测试套件的情况下都不应可合并。

#### CI-03 · CI runs lint/typecheck — 3 pts {#ci-03}
**修复：** 廉价的计算型传感器应随每次 push 运行 — 质量左移。

#### CI-04 · Pre-commit checks installed — 3 pts {#ci-04}
husky/lint-staged、`pre-commit` 或 lefthook。
**修复：** 提交能获得的最早反馈；在变更进入历史前捕获编辑时 hooks 漏掉的问题。

### Hygiene & Safety (23 pts)

#### HYG-01 · .gitignore present — 2 pts {#hyg-01}
**修复：** 智能体会提交它看到的内容；让构建产物与本地状态不可见。

#### HYG-02 · .gitignore covers env files — 3 pts {#hyg-02}
.gitignore 中有 `.env` 模式。
**修复：** 添加 `.env` 与 `.env.*`（允许 `!.env.example`）— 最便宜的护栏。

#### HYG-03 · No unprotected .env files — 4 pts {#hyg-03}
树中无未 gitignore 的真实 env 文件（模板可保留）。
**修复：** 移走 secrets；保留 `.env.example` 记录所需变量。

#### HYG-04 · MCP config free of credentials — 4 pts {#hyg-04}
MCP 配置（`.cursor/mcp.json`、`.mcp.json`、
`.agents/mcp_config.json`）中无 credential 特征。
**修复：** 使用 `${ENV_VAR}` 插值 — MCP 配置中的内联 key 等于向每个 clone 公开的 secret。

#### HYG-05 · License present — 2 pts {#hyg-05}
**修复：** 添加 LICENSE；开源使用与插件 marketplace 所需。

#### HYG-06 · No secrets in harness files — 2 pts {#hyg-06}
AGENTS.md、rules 与 hooks 配置中无 token 特征。
**修复：** 这些文件每次会话都会加载进模型上下文 — 其中的 key 按设计会被泄露。

#### HYG-07 · Lockfile committed — 3 pts {#hyg-07}
package-lock.json、uv.lock、Cargo.lock、go.sum 或等价 lockfile。
**修复：** 可复现安装意味着传感器在各处测试同一依赖树。

#### HYG-08 · MCP config uses env interpolation for credentials — 3 pts {#hyg-08}
MCP 配置文件有效，且任何 credential 形字段（token、key、
secret、password 等）使用 `${ENV_VAR}` 插值而非字面量。
HYG-04 的正面补充 — 无 MCP 设置的仓库此处不得分，
与其他加分检查相同。
**修复：** 将 secrets 引用为 `"${VAR_NAME}"`，并在 `.env.example` 中记录所需变量。

## 实践改进计划

从典型的 L0 产品仓库出发，每级一轮专注工作：

1. **→ L1（一个下午）。** 写 `AGENTS.md`（CTX-01/02）。即使传感器较弱，也要包含构建/测试
   命令 — 智能体会用到它们。
2. **→ L2（一天）。** 三条 scoped rules + 一个最常重复流程的 skill
   （CTX-03…06、SKL-01/02）。修复卫生项：gitignore、env 文件、
   许可证（HYG-01…05）。
3. **→ L3（若缺传感器则是真功夫）。** 测试 runner + linter +
   严格类型 + 运行三者的 `ci.yml`（SNS-*、CI-01…03）。若已有，
   这一级几乎免费。
4. **→ L4（一个上午）。** 第 5 章的两个 hooks — 一个 gate、一个
   formatter — 与脚本一起提交（HKS-*）、pre-commit（CI-04），
   然后在 CI 中设置 `--min-level 4`，使其永不退化。
