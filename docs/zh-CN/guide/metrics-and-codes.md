# 指标与代码参考

`harness-score` 报告内容的速查表：分数、scope、等级、维度、check ID、配置键、CLI 标志、Action 输入与 JSON 字段。修复方案见
[第 8 章 — 测量与改进](./measure-and-improve#the-check-catalog)。

## 分数：maturity vs effective {#scores-maturity-vs-effective}

| 代码 | 包含内容 | 用途 |
|---|---|---|
| **maturity** | 仅仓库文件（`scopes: repo`） | 默认 CI gate、badge、`--min-level`、团队官方成熟度 |
| **effective** | 仓库 ∪ 已配置的全局/额外 scope | 本地查看「此机器上 agent 实际可见内容」（启用 user/system harness 时） |

未配置额外 scope 时，`effective` 等于 `maturity`（相同等级、分数与 checks）。报告始终包含两个块以保持 JSON 稳定。

通过配置中的 `gate`、`--gate` 或 Action 的 `gate` 输入（默认 `maturity`）设置 CI 以哪个分数 gate。

## 范围 {#scopes}

| Scope | 含义 | 扫描内容 |
|---|---|---|
| `repo` | 始终开启 | 传给 `harness-score` 的目录（默认 `.`） |
| `user` | 可选 | allowlisted 用户级路径映射为 repo-relative 形状：`~/.cursor/*`、`~/.claude/*`、`~/.codeium/windsurf/*`（Windsurf 别名）、`~/Documents/Cline/Rules` → `.clinerules/`、`~/.continue/{rules,prompts}`、`~/.agents/*`、`~/.zed/commands`、`~/.config/opencode/agents` 等。见 [多 harness — 各工具 user scope](./multi-harness#user-scope-by-tool)。**不含：** Copilot 全局（仅 repo）、Continue 在 `config.yaml` 中的内联 rules、仅 UI 的 Cursor User Rules。 |
| `system` | 可选 | 保留给已验证的系统级安装（v1 中极少） |
| `extraRoots` | 可选 | 额外目录（相对或绝对），其目录树镜像 harness 布局 — 例如共享团队 harness checkout |

冲突时（相同相对路径），项目文件**优先**于 overlay 路径。

**不扫描：** 仅存在于 IDE UI 的 Cursor User Rules（不在磁盘上）、任意 home 目录遍历，或 evidence 字符串中的 secrets 内容。

## 等级（L0–L4）

官方等级名称适用于 **maturity**，除非你设置 `gate: effective`。

| 等级 | 名称 | 要求（含所有更低等级 +） |
|---|---|---|
| L0 | Unharnessed | — |
| L1 | Documented | context ≥ 40% |
| L2 | Guided | context ≥ 60%；skills ≥ 30% **或** hooks ≥ 30%；hygiene ≥ 50% |
| L3 | Sensing | sensors ≥ 60%；ci ≥ 50% |
| L4 | Self-correcting | hooks ≥ 70%；total ≥ 80% |

完整说明：[成熟度模型](./maturity-model)。

## 维度

| ID | 标题 | 最高分 | 衡量内容 |
|---|---|---|---|
| `context` | Context & Guides | 20 | AGENTS.md、scoped rules、README |
| `skills` | Skills & Commands | 17 | Skills、commands/workflows、subagents |
| `hooks` | Hooks & Guardrails | 14 | hooks.json / Claude settings hooks |
| `sensors` | Sensors & Feedback | 20 | 测试、linter、类型、formatter |
| `ci` | CI Feedback | 14 | Pipeline、pre-commit |
| `hygiene` | Hygiene & Safety | 23 | .gitignore、secrets、lockfile、license、MCP 卫生 |

**总计：** 108 分。

## Check 目录

稳定 ID — 链接至 [测量与改进](./measure-and-improve#the-check-catalog) 中的修复方案。

### Context & Guides

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| CTX-01 | 4 | 根目录存在 `AGENTS.md`、`CLAUDE.md` 或 `GEMINI.md` | [ctx-01](./measure-and-improve#ctx-01) |
| CTX-02 | 3 | 上下文文件 ≥20 行有意义内容且 ≥2 个 heading | [ctx-02](./measure-and-improve#ctx-02) |
| CTX-03 | 4 | 至少一个 scoped rule 文件（任意支持工具）或嵌套上下文文件 | [ctx-03](./measure-and-improve#ctx-03) |
| CTX-04 | 3 | 每条 rule 在 frontmatter 中声明激活元数据 | [ctx-04](./measure-and-improve#ctx-04) |
| CTX-05 | 2 | 并非所有 rule 都是 blanket always-on | [ctx-05](./measure-and-improve#ctx-05) |
| CTX-06 | 2 | 无单个 rule 文件超过 500 行 | [ctx-06](./measure-and-improve#ctx-06) |
| CTX-07 | 1 | 仓库根目录有 `README.md` | [ctx-07](./measure-and-improve#ctx-07) |
| CTX-08 | 1 | 无遗留 `.cursorrules` 且缺少现代 scoped rules | [ctx-08](./measure-and-improve#ctx-08) |

### Skills & Commands

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| SKL-01 | 4 | 在 recognized skills 目录下至少一个 `SKILL.md` | [skl-01](./measure-and-improve#skl-01) |
| SKL-02 | 3 | 每个 skill 的 frontmatter 含 `name:` 与 `description:` | [skl-02](./measure-and-improve#skl-02) |
| SKL-03 | 3 | 任意支持工具存在 command/workflow 文件 | [skl-03](./measure-and-improve#skl-03) |
| SKL-04 | 2 | Skill 描述 ≥40 字符 | [skl-04](./measure-and-improve#skl-04) |
| AGT-01 | 3 | 至少一个 subagent markdown 文件 | [agt-01](./measure-and-improve#agt-01) |
| AGT-02 | 2 | 每个 subagent 有 `name:` 与 `description:` frontmatter | [agt-02](./measure-and-improve#agt-02) |

### Hooks & Guardrails

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| HKS-01 | 4 | Hooks 配置存在且可解析为 JSON | [hks-01](./measure-and-improve#hks-01) |
| HKS-02 | 2 | Event 与 typed handler 结构有效；未知但有效的 event 产生 warning | [hks-02](./measure-and-improve#hks-02) |
| HKS-03 | 4 | 注册了 gate 类 hook（shell/MCP/read/tool gate） | [hks-03](./measure-and-improve#hks-03) |
| HKS-04 | 2 | 注册了 feedback 类 hook（post-edit/tool） | [hks-04](./measure-and-improve#hks-04) |
| HKS-05 | 2 | Executable 与 args 中的每个本地路径都存在；非 command handler 不适用 | [hks-05](./measure-and-improve#hks-05) |

### Sensors & Feedback

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| SNS-01 | 6 | 配置了 test runner（`package.json` script、pytest、go test 等） | [sns-01](./measure-and-improve#sns-01) |
| SNS-02 | 5 | 配置了 linter（eslint、biome、ruff、golangci-lint 等） | [sns-02](./measure-and-improve#sns-02) |
| SNS-03 | 4 | 配置了 type checking（tsconfig、mypy、pyright 等） | [sns-03](./measure-and-improve#sns-03) |
| SNS-04 | 3 | 配置了 formatter（prettier、black、gofmt 等） | [sns-04](./measure-and-improve#sns-04) |
| SNS-05 | 2 | 目录树中至少存在一个测试文件 | [sns-05](./measure-and-improve#sns-05) |

### CI Feedback

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| CI-01 | 4 | 存在 CI pipeline 文件（GitHub Actions、GitLab CI 等） | [ci-01](./measure-and-improve#ci-01) |
| CI-02 | 4 | CI 运行测试套件 | [ci-02](./measure-and-improve#ci-02) |
| CI-03 | 3 | CI 运行 lint 或 typecheck | [ci-03](./measure-and-improve#ci-03) |
| CI-04 | 3 | 安装了 pre-commit 或 git hook 工具 | [ci-04](./measure-and-improve#ci-04) |

### Hygiene & Safety

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| HYG-01 | 2 | 存在 `.gitignore` | [hyg-01](./measure-and-improve#hyg-01) |
| HYG-02 | 3 | `.gitignore` 覆盖环境文件 | [hyg-02](./measure-and-improve#hyg-02) |
| HYG-03 | 4 | 无未保护的 `.env` 文件（无 `.env.example` 模式） | [hyg-03](./measure-and-improve#hyg-03) |
| HYG-04 | 4 | MCP JSON 配置无 inline 凭证模式 | [hyg-04](./measure-and-improve#hyg-04) |
| HYG-05 | 2 | 存在 `LICENSE` 文件 | [hyg-05](./measure-and-improve#hyg-05) |
| HYG-06 | 2 | harness markdown/JSON 中无类凭证签名 | [hyg-06](./measure-and-improve#hyg-06) |
| HYG-07 | 3 | 已提交依赖 lockfile | [hyg-07](./measure-and-improve#hyg-07) |
| HYG-08 | 3 | MCP 配置对 secrets 使用 env 插值 | [hyg-08](./measure-and-improve#hyg-08) |

## 配置文件（`.harness-score.json`）{#configuration-file-harness-scorejson}

扫描根目录的可选 JSON（严格 schema — 未知键报错）：

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

| 键 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `scopes.user` | boolean | `false` | 包含用户级 harness overlay |
| `scopes.system` | boolean | `false` | 包含系统级 overlay |
| `extraRoots` | `{ id, path }[]` | `[]` | 合并到 effective 的额外 harness 树 |
| `gate` | `"maturity"` \| `"effective"` | `"maturity"` | `--min-level` 使用的分数 |
| `extends` | `string[]` | `[]` | 要应用的具名 preset（见下文） |
| `rules` | `Record<checkId, severity>` | `{}` | 按 check 的 severity override，应用于 `extends` 中每个 preset 之后 |

优先级：**CLI 标志 → Action 输入 → 配置文件 → 默认值**。`extends`/`rules` 在本版本中仅限配置文件使用 — 目前没有对应的 `--extends`/`--rule` CLI 标志或 Action 输入；可用 `--config <path>` 指向一个定义了它们的 `.harness-score.json`。

### 团队定制：`extends` 与 `rules` {#team-customization}

这套词汇直接借用自 ESLint，因为大多数团队已经熟悉它：

- **`rules`** 按 check ID 覆盖单个 check 的 severity：`"HYG-05": "off"`。本版本 severity 只接受 `"off"` 或 `"error"` — `"error"` 是每个 check 的隐式默认值，`"off"` 会把该 check 同时从其 dimension 分数的**分子和分母**中移除（结构性排除，永不计为 fail）。`"warn"` 是一个被识别但目前故意拒绝的值，会给出清晰的「尚未支持」错误 — 预留给未来的 advisory、non-blocking 模式。
- **`extends`** 应用一个由 maintainer 精心维护的具名 preset — 是经过版本管理、PR review 的一组 `rules` overrides，而不是自由裁量的 per-repo 例外。这保持了与保护 checks 目录相同的治理方式：提出新 preset 需要走 review（见 [CONTRIBUTING.md](https://github.com/paladini/harness-score/blob/main/CONTRIBUTING.md#proposing-a-preset)），而不是静默的本地 opt-out。`extends` 中的 preset 按数组顺序应用，`rules` 中任何显式条目始终优先于 preset。

任何被 `extends`/`rules` 排除的 check 都始终会被披露 — 在终端输出中（`Preset: ...` 行）、Markdown 报告中（`**Preset:**` 行以及 checks 表格中的 `➖` 状态）、以及 `--json` 的 `preset` 字段中 — 绝不会被静默隐藏在某个 flag 后面。

有一个例外，是刻意为之的：`HYG-03`、`HYG-04`、`HYG-06` — 这些检测「实际泄露或暴露的凭证」的 checks — 无论通过 `rules` 还是 preset，都永远不能设为 `"off"`。这套配置格式里的其他一切都依赖披露与 PR review 来维护 integrity；这三个是唯一不可协商的例外。

#### 内置 preset

| Preset | 效果 | 原因 |
|---|---|---|
| `no-hooks` {#preset-no-hooks} | 将 `HKS-01`–`HKS-05`（整个 Hooks & Guardrails dimension，占 108 分中的 14 分）设为 `"off"` | 用于本地 hook 脚本执行被 policy 禁止的环境 — 被锁定的 dev container、受监管的组织、没有权限安装 hooks 的共享 runner。这类场景下 guardrail 只能在 CI 中生效。|

排除整个 dimension 有一个值得提前知道的、诚实的后果：由于 **L4 · Self-correcting** 就是由 runtime guardrail hooks *定义*的（见[成熟度模型](./maturity-model)），采用 `no-hooks` preset 的仓库永远无法达到 L4 — 该 level 会变成 **capped**，而不是「未通过」。`report.level.capped` 为 `true`，`report.level.capReason` 解释原因；其他所有 dimension 的分数完全不受影响。这是 scanner 在「self-correcting」这个词的含义上保持诚实，而不是对排除 hooks 的惩罚。

优先级：**CLI 标志 → Action 输入 → 配置文件 → 默认值**。

## CLI 标志（扫描配置）

仓库 maturity 发现没有生产环境深度上限。跳过已知依赖和生成目录后，它会包含 tracked、
untracked 和 ignored 文件。仓库扫描中的 `file-count-limit` 表示 1,000,000 个文件的
紧急保险丝；有界的 user 和 extra-root overlay 仍可能报告 `depth-limit`。如果 check
请求检查一个已发现但无法读取的路径，则报告 `unreadable-path`；有意跳过的 512 KiB
以上文件内容不会报告该原因。内部 symlink 会被跟随并去重；指向扫描根目录之外的目标会
报告 `outside-root-symlink`，且不会被遍历或读取。

| 标志 | 含义 |
|---|---|
| `--config <file>` | 从指定路径加载配置 |
| `--scope user` | 启用 user scope（逗号分隔：`user`、`system`） |
| `--gate maturity\|effective` | `--min-level` 使用的分数 |
| `--min-level <0-4>` | 完整 gated 分数低于等级时 exit 1；gate 选择的 snapshot 不完整时 exit 2 |
| `--json` | 完整报告，含 `scopes`、`gate`、`effective` 与 `verdicts` |

## GitHub Action 输入

| 输入 | 默认 | 含义 |
|---|---|---|
| `include-user-harness` | `false` | 传递 `--scope user` |
| `include-system-harness` | `false` | 传递 `--scope system` |
| `gate` | `maturity` | 传递 `--gate` |
| `config` | `''` | 设置时传递 `--config` |
| `min-level` | `0` | gated 分数低于等级时失败 |

Outputs：`level`、`level-name`、`percent`（maturity）；`effective-level`、`effective-percent`。
Action 仅在 maturity 完整时发布 maturity outputs、badge 和报告，仅在 effective 完整时发布 effective outputs。若只有 effective 不完整，`gate: maturity` 可在给出警告后通过；`gate: effective` 返回 exit 2。Maturity 不完整时不发布 maturity outputs、badge、报告或 PR comment。

## 报告 JSON 字段（稳定）

| 字段 | 描述 |
|---|---|
| `root` | 绝对扫描根 |
| `scopes.maturity` | 始终 `["repo"]` |
| `scopes.effective` | 如 `["repo"]`、`["repo","user"]` |
| `gate` | `"maturity"` 或 `"effective"` |
| `resolvedRoots` | overlay 的可选 `{ scope, absPath }` 列表 |
| `level`、`score`、`dimensions`、`checks` | **maturity** 快照 |
| `preset` | `{ extends, rules, resolved }` — 本次 scan 实际应用的团队定制；`resolved` 只列出 severity 不同于默认值的 checks |
| `level.capped`、`level.capReason` | 当下一 level 的某个 blocking requirement 在当前配置下永远无法满足时（例如其 dimension 被 preset 排除），`capped` 为 `true`；`capReason` 说明原因 |
| `dimensions[].applicable` | 仅当该 dimension 中所有 check 都解析为 `"off"` 时为 `false` |
| `checks[].severity` | `"off"` \| `"warn"` \| `"error"` — 本次 scan 对该 check 使用的最终 severity |
| `checks[].warnings` | 可选的非致命诊断 `{ code, message, source? }`；terminal 与 Markdown 会显示它们，但不改变分数 |
| `effective` | 相同结构：`{ level, score, dimensions, checks, detectedHarnesses }` |
| `detectedHarnesses` | **repo** 中看到的工具（仅供参考） |
| `verdicts.maturity`、`verdicts.effective` | 每个 snapshot 的完整性状态与确定性原因：`complete` 或 `incomplete` |
| `verdicts.*.reasons[]` | `file-count-limit`、`depth-limit`、`unreadable-directory`、`unreadable-path` 或 `outside-root-symlink`，可带 `path` 与 `limit` |
| `truncated` | 兼容别名；maturity 或 effective snapshot 因任何原因不完整时为 `true` |

`level`、`score`、dimensions 与 checks 仍会保留用于诊断，但对应 verdict 为 `incomplete` 时仅是 provisional。Terminal 与 Markdown 会明确指出不可用的 snapshot。Badge 始终表示 maturity；当 maturity 不完整时值为 `incomplete`，绝不显示 L0-L4。旧报告缺少 `verdicts` 时，`truncated: false` 视为完整，`truncated: true` 视为不完整。

`--diff` 默认比较 **maturity** 字段（顶层 `level` / `score` / `checks`），并拒绝 maturity 不完整的 baseline 或当前结果。Effective 不完整不会阻止 maturity diff。
