# Cursor harness 表面

Cursor 暴露的 harness 机制多于任何其他主流 AI 编辑器。
本章是一张地图：每种工件、所在位置，以及在控制系统中的职责。

> **说明：** Harness Score 通过 OR 语义支持多种工具（Claude Code、Windsurf、Cline、Continue 等）。本章以 Cursor 为旗舰示例。见 [多 harness 支持](./multi-harness) 了解其他工具如何识别与评分。

## 工件一览

| 工件 | 路径 | 家族 | 加载时机 |
|---|---|---|---|
| 智能体上下文文件 | `AGENTS.md` | 指南 | 始终 |
| Rules | `.cursor/rules/*.mdc` | 指南 | 始终 / 按 glob / 按相关性 |
| Skills | `.cursor/skills/*/SKILL.md` | 指南 | 按需，按 description |
| Commands | `.cursor/commands/*.md` | 指南 | 显式，通过 `/name` |
| Hooks | `.cursor/hooks.json` | 传感器 + guardrails | 智能体循环事件 |
| MCP 服务器 | `.cursor/mcp.json` | 指南（工具） | 每会话 |
| Subagents | 智能体定义 | 指南 | 委派任务 |
| Plugins | Marketplace / `.cursor-plugin/` | 全部打包 | 已安装 |

一切均在仓库中 — 要点是：**harness 与代码一起发布**、与代码一起版本化、并像代码一样接受审查。

## AGENTS.md — 前门

仓库根目录的 `AGENTS.md` 是智能体读取的第一份文件。它是开放约定（Cursor、Claude Code 及多数智能体型工具均遵守），也是 harness 中杠杆最高的单文件。应简要回答：

- 项目是什么、目录如何组织？
- 如何构建、运行与**测试**？
- 哪些约定不可协商？
- 绝不能动什么？

保持在约 150 行以内。每会话都会加载 — 每一行都会占用每个任务的上下文窗口。仅在某些任务中才相关的细节，应放在作用域 rules 或 skills 中。

## Rules — 持久、声明式引导

Rules 是 `.cursor/rules/` 下带 frontmatter 的 Markdown 文件（`.mdc`）。
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

- `alwaysApply: true` — 注入每个请求。仅留给真正不可协商的项；每个始终生效的 rule 都是永久的上下文开销。
- `globs: <pattern>` — 当相关文件参与任务时应用。这是主力模式：约定与所治理的代码相邻放置。
- 仅 `description` — 智能体根据 description 判断相关性。

在 monorepo 中，嵌套的 `.cursor/rules/` 目录同样有效：在包内放置包级 rules。

旧版单文件 `.cursorrules` 已弃用。迁移方式：按主题拆分，按 glob 限定作用域。

## Skills — 按需的程序性知识

Skill 是包含 `SKILL.md` 的文件夹（开放的 Agent Skills 标准）：

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
正文**仅在智能体判断相关时**加载。因此 skills 适合存放会撑大 rules 的长程序性内容：部署手册、迁移方案、发布清单、调试手册。

经验法则：**rules 是声明式、偏始终生效（「使用 strict TypeScript」），skills 是程序式、按需加载（「这是我们如何部署」）**。
description 就是触发器 — 应写成「Use when…」，否则永远不会被加载。

## Commands — 刻意调用的工作流

`.cursor/commands/` 下的 Markdown 文件会成为 `/slash-commands`。与 skills（由智能体触发）不同，commands 是**由人触发**：可重复的工作流，放在类似快捷键的入口 — `/review`、`/release`、`/harness-audit`。command 文件就是调用时运行的提示词。

## Hooks — 观察并控制智能体循环

`.cursor/hooks.json` 在智能体生命周期事件上注册脚本：

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard.js" }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format.js" }]
  }
}
```

脚本从 stdin 接收 JSON，在 stdout 返回结果 — 包括门禁事件的权限决策（`allow` / `deny` / `ask`）。关键事件：

- **门禁**（可阻塞）：`beforeShellExecution`、`beforeMCPExecution`、`preToolUse`、`beforeReadFile`
- **Feedback**（观察结果）：`afterFileEdit`、`postToolUse`、`afterShellExecution`、`stop`
- **生命周期**：`sessionStart`（注入上下文）、`sessionEnd`、`preCompact`

Hooks 是 Cursor 中唯一由 *harness 运行时强制执行*、而非 *向模型建议* 的机制。说「永不运行破坏性命令」的 rule 只是请求；在 `beforeShellExecution` 中拒绝它们的 hook 才是事实。第 5 章在此区别上展开。

## MCP — 工具与知识

`.cursor/mcp.json` 连接 Model Context Protocol 服务器：数据库、议题跟踪、文档、浏览器。从 harness 视角，MCP 既是 guide（决定智能体*能看能做什么*），也是风险面（服务器以你的凭证运行 — 切勿内联密钥；使用 `${ENV_VAR}` 插值）。

## 子智能体 — 专用委派者 {#subagents-purpose-built-delegates}

Subagent 是 `.cursor/agents/`（或插件 `agents/` 目录）下的 Markdown 文件，遵循与 skill 相同的 `name` + `description` frontmatter 约定：

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

与 skill 的区别：skill 教*主*智能体一项可在同一会话内执行的程序；subagent 是主智能体**委派任务**的独立工作者 — 通常拥有更窄的工具权限或职责范围，使大型任务（全仓库审计、多步发布）可拆给专用工作者，而非由单个智能体在一个上下文中包办一切。Cursor 官方文档将此描述为委派为特定用途构建的工作 — 规划者、审查者、发布执行者 — 每个 description 足够精确，主智能体可判断何时移交，而无需猜测。

与 skills 相同：description 是父智能体决定是否委派的唯一信号，因此应写成触发条件，而非标签。

## Plugins — 打包的 harness

Cursor 插件在可安装单元下打包 rules、skills、commands、hooks、agents 与 MCP 配置，附带 `.cursor-plugin/plugin.json` 清单，经 [Cursor Marketplace](https://cursor.com/marketplace) 分发。插件对 harness 工程很重要，因为它们使 harness 模式**可跨仓库复用** — 包括 [Harness Score 插件](./measure-and-improve#the-cursor-plugin)，它审计本章所述的工件（今日可从仓库目录安装；Marketplace 上架审核中）。

## 选对机制

| 你想… | 使用 |
|---|---|
| 陈述始终成立的约定 | Rule（`alwaysApply`）— 慎用 |
| 陈述代码库某部分的约定 | 带 `globs` 的 Rule |
| 教授多步程序 | Skill |
| 打包由人触发的工作流 | Command |
| 将工作委派给独立的专用子智能体 | 子智能体 |
| 无论模型怎么想都强制执行 | Hook |
| 给智能体工具或数据源 | MCP 服务器 |
| 跨仓库共享以上全部 | Plugin |

若某条引导反复被忽略，沿此表*向下*移动 — 从模型可能跳过的说明文字，转向运行时强制执行的机制。
