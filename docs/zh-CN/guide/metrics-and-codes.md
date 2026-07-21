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
| HKS-02 | 2 | Hooks 声明 version/metadata 与已知 event 名称 | [hks-02](./measure-and-improve#hks-02) |
| HKS-03 | 4 | 注册了 gate 类 hook（shell/MCP/read/tool gate） | [hks-03](./measure-and-improve#hks-03) |
| HKS-04 | 2 | 注册了 feedback 类 hook（post-edit/tool） | [hks-04](./measure-and-improve#hks-04) |
| HKS-05 | 2 | 配置中引用的每个 hook 脚本路径在 repo 中存在 | [hks-05](./measure-and-improve#hks-05) |

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
| CI-03 | 4 | CI 运行 lint 或 typecheck | [ci-03](./measure-and-improve#ci-03) |
| CI-04 | 2 | 安装了 pre-commit 或 git hook 工具 | [ci-04](./measure-and-improve#ci-04) |

### Hygiene & Safety

| ID | 分 | 精确分析 | 修复 |
|---|---|---|---|
| HYG-01 | 4 | 存在 `.gitignore` | [hyg-01](./measure-and-improve#hyg-01) |
| HYG-02 | 3 | `.gitignore` 覆盖环境文件 | [hyg-02](./measure-and-improve#hyg-02) |
| HYG-03 | 4 | 无未保护的 `.env` 文件（无 `.env.example` 模式） | [hyg-03](./measure-and-improve#hyg-03) |
| HYG-04 | 4 | MCP JSON 配置无 inline 凭证模式 | [hyg-04](./measure-and-improve#hyg-04) |
| HYG-05 | 2 | 存在 `LICENSE` 文件 | [hyg-05](./measure-and-improve#hyg-05) |
| HYG-06 | 3 | harness markdown/JSON 中无类凭证签名 | [hyg-06](./measure-and-improve#hyg-06) |
| HYG-07 | 3 | 已提交依赖 lockfile | [hyg-07](./measure-and-improve#hyg-07) |
| HYG-08 | 4 | MCP 配置对 secrets 使用 env 插值 | [hyg-08](./measure-and-improve#hyg-08) |

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
  "gate": "maturity"
}
```

| 键 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `scopes.user` | boolean | `false` | 包含用户级 harness overlay |
| `scopes.system` | boolean | `false` | 包含系统级 overlay |
| `extraRoots` | `{ id, path }[]` | `[]` | 合并到 effective 的额外 harness 树 |
| `gate` | `"maturity"` \| `"effective"` | `"maturity"` | `--min-level` 使用的分数 |

优先级：**CLI 标志 → Action 输入 → 配置文件 → 默认值**。

## CLI 标志（扫描配置）

| 标志 | 含义 |
|---|---|
| `--config <file>` | 从指定路径加载配置 |
| `--scope user` | 启用 user scope（逗号分隔：`user`、`system`） |
| `--gate maturity\|effective` | `--min-level` 使用的分数 |
| `--min-level <0-4>` | gated 分数低于等级时 exit 1 |
| `--json` | 完整报告，含 `scopes`、`gate`、`effective` |

## GitHub Action 输入

| 输入 | 默认 | 含义 |
|---|---|---|
| `include-user-harness` | `false` | 传递 `--scope user` |
| `include-system-harness` | `false` | 传递 `--scope system` |
| `gate` | `maturity` | 传递 `--gate` |
| `config` | `''` | 设置时传递 `--config` |
| `min-level` | `0` | gated 分数低于等级时失败 |

Outputs：`level`、`level-name`、`percent`（maturity）；`effective-level`、`effective-percent`。

## 报告 JSON 字段（稳定）

| 字段 | 描述 |
|---|---|
| `root` | 绝对扫描根 |
| `scopes.maturity` | 始终 `["repo"]` |
| `scopes.effective` | 如 `["repo"]`、`["repo","user"]` |
| `gate` | `"maturity"` 或 `"effective"` |
| `resolvedRoots` | overlay 的可选 `{ scope, absPath }` 列表 |
| `level`、`score`、`dimensions`、`checks` | **maturity** 快照 |
| `effective` | 相同结构：`{ level, score, dimensions, checks, detectedHarnesses }` |
| `detectedHarnesses` | **repo** 中看到的工具（仅供参考） |
| `truncated` | 遍历达到文件上限 |

`--diff` 默认比较 **maturity** 字段（顶层 `level` / `score` / `checks`）。
