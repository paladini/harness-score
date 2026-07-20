# Cursor harness 表面

Cursor 暴露的 harness 机制多于任何其他主流 AI 编辑器。
本章是地图：每个 artifact、所在位置、在控制系统中的职责。

> **说明：** Harness Score 通过 OR 语义支持多工具（Claude Code、Windsurf、Cline、Continue 等）。本章以 Cursor 为旗舰示例。见 [多 harness 支持](./multi-harness) 了解其他工具如何识别与评分。

## 一览

| Artifact | 路径 | 家族 | 加载时机 |
|---|---|---|---|
| 智能体上下文文件 | `AGENTS.md` | 指南 | 始终 |
| Rules | `.cursor/rules/*.mdc` | 指南 | 始终 / 按 glob / 按相关性 |
| Skills | `.cursor/skills/*/SKILL.md` | 指南 | 按需，按 description |
| Commands | `.cursor/commands/*.md` | 指南 | 显式，via `/name` |
| Hooks | `.cursor/hooks.json` | 传感器 + Guardrail | 智能体循环事件 |
| MCP servers | `.cursor/mcp.json` | 指南（工具） | 每会话 |
| Subagents | agent 定义 | 指南 | 委派任务 |
| Plugins | Marketplace / `.cursor-plugin/` | 全部打包 | 已安装 |

一切在仓库中 — 要点是：**harness 与代码一起发布**、与代码一起版本化、像代码一样审查。

## AGENTS.md — 前门

仓库根的 `AGENTS.md` 是智能体读的第一件事。它是开放约定（Cursor、Claude Code 及多数 agentic 工具遵守），也是 harness 中杠杆最高的单文件。应简要回答：

- 项目是什么、如何布局？
- 如何 build、run 与 **test**？
- 哪些约定不可协商？
- 绝不能动什么？

保持在约 150 行以内。每会话加载 — 每行消耗每个任务的 context window。仅有时相关的细节应放在 scoped rules 或 skills。

## Rules — 持久、声明式引导

Rules 是 `.cursor/rules/` 下带 frontmatter 的 markdown（`.mdc`）。
每条 rule 声明*何时适用*：

```markdown
---
description: API route conventions
globs: src/api/**
---

- Every route validates input with zod before use.
- Errors return `{ "error": string }` and a correct status code.
```

三种激活模式：

- `alwaysApply: true` — 注入每个请求。留给真正不可协商项；每个 always-on rule 是永久 context 税。
- `globs: <pattern>` — 相关文件在 play 时应用。主力模式：约定与所治理代码相邻。
- 仅 `description` — 智能体从 description 判断相关性。

monorepo 中嵌套 `.cursor/rules/` 有效：在包内放包特定 rules。

旧版单文件 `.cursorrules` 已弃用。迁移：按 concern 拆分，按 glob scope。

## Skills — 按需程序性知识

Skill 是含 `SKILL.md` 的文件夹（开放 Agent Skills 标准）：

```markdown
---
name: deploy
description: Use when the user asks to deploy or release; covers tagging,
  pipeline, and smoke tests.
---

# Deploying
1. …step-by-step workflow…
```

Cursor 在会话开始向智能体展示每个 skill 的 `name` + `description`；
body **仅在智能体判断相关时**加载。因此 skills 适合会膨胀 rules 的长程序内容：deploy runbook、迁移方案、发布 checklist、调试 playbook。

经验法则：**rules 是声明式、偏 always-on（「用 strict TypeScript」），skills 是程序式、按需（「这是我们如何 deploy」）**。
description 是触发器 — 写成「Use when…」否则永不触发。

## Commands — 你刻意调用的工作流

`.cursor/commands/` 下的 markdown 成为 `/slash-commands`。与 skills（智能体触发）不同，commands 是**人类触发**：你想要类快捷键表面的可重复工作流 — `/review`、`/release`、`/harness-audit`。command 文件就是调用时运行的 prompt。

## Hooks — 观察并控制智能体循环

`.cursor/hooks.json` 在智能体生命周期事件注册脚本：

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard.js" }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format.js" }]
  }
}
```

脚本从 stdin 收 JSON，stdout 回答 — 包括 gating 事件的权限决策（`allow` / `deny` / `ask`）。关键事件：

- **Gates**（可阻塞）：`beforeShellExecution`、`beforeMCPExecution`、`preToolUse`、`beforeReadFile`
- **Feedback**（观察结果）：`afterFileEdit`、`postToolUse`、`afterShellExecution`、`stop`
- **Lifecycle**：`sessionStart`（注入上下文）、`sessionEnd`、`preCompact`

Hooks 是唯一由 *harness 运行时强制执行* 而非 *向模型建议* 的 Cursor 机制。说「永不运行破坏性命令」的 rule 是请求；deny 它们的 `beforeShellExecution` hook 是事实。第 5 章在此 distinction 上展开。

## MCP — 工具与知识

`.cursor/mcp.json` 连接 Model Context Protocol 服务器：数据库、issue tracker、文档、浏览器。从 harness 视角 MCP 是 guide（决定智能体*能看能做什么*）也是风险面（服务器用你的凭证运行 — 永不内联密钥；用 `${ENV_VAR}` 插值）。

## Subagents — 专用委派者 {#subagents-purpose-built-delegates}

Subagent 是 `.cursor/agents/`（或插件 `agents/`）下的 markdown，与 skill 相同的 `name` + `description` frontmatter 约定：

```markdown
---
name: reviewer
description: Use when asked to review a pull request or diff for conventions
  in AGENTS.md and .cursor/rules; reports findings by severity without
  editing code.
---

# Reviewer subagent

Read the diff, AGENTS.md, and .cursor/rules/*.mdc. Report violations ordered
by severity. Never modify code — that's the parent agent's job.
```

与 skill 的区别：skill 教*主*智能体 inline 运行的程序；subagent 是主智能体**委派任务**的独立 worker — 常有独立 scoped 工具访问或更窄 job description，大任务（全 repo audit、多步 release）可拆到 specialized worker 而非单智能体单 context 包办。

Cursor 文档将此描述为委派「purpose-built」工作 — planner、reviewer、release runner — 每个 description 足够紧，主智能体可决定何时 hand off 而无需猜测。

与 skills 相同规则适用于 description：是父智能体决定是否委派的唯一信号，故写成触发条件，非标签。

## Plugins — 打包的 harness

Cursor 插件在可安装单元下打包 rules、skills、commands、hooks、agents 与 MCP 配置，带 `.cursor-plugin/plugin.json` manifest，经 [Cursor Marketplace](https://cursor.com/marketplace) 分发。插件对 harness 工程重要，因它们使 harness 模式**跨仓库可复用** — 包括 [Harness Score 插件](./measure-and-improve#the-cursor-plugin)，审计本章所述 artifact（今日可从 repo 目录安装；Marketplace  listing 待审）。

## 选对机制

| 你想… | 用 |
|---|---|
| 陈述始终成立的约定 | Rule（`alwaysApply`）—  sparingly |
| 陈述代码库某部分的约定 | 带 `globs` 的 Rule |
| 教多步程序 | Skill |
| 打包人类触发的工作流 | Command |
| 委派给独立 purpose-built worker | Subagent |
| 无论模型怎么想都强制执行 | Hook |
| 给智能体工具或数据源 | MCP server |
| 跨 repo 共享以上全部 | Plugin |

若某引导反复被忽略，沿此表*向下*移动 — 从模型可能跳过的 prose，到 runtime 强制执行的机制。
