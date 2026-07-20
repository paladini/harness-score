# 指南 — Feedforward 控制

指南在智能体行动*之前*塑造其行为。它们是最廉价的控制：对的地方一段文字能阻止整类错误。本章讲如何写好它们。

## 上下文经济学

每个 guide 竞争同一稀缺资源：模型的 context window 与注意力。热情团队的失败模式不是 guide 太少而是**字太多** — 智能体 skim 的 2000 行 rules、贴进 `AGENTS.md` 的 wiki。LangChain 的 harness 教训在此适用：*代智能体组装上下文* 意味着给对 50 行，而非全部 5000。

实用预算：

- `AGENTS.md`：≤150 行，始终加载 — 仅适用于*每个*任务的内容。
- Always-on rules：一两个，各 ≤30 行。
- Glob-scoped rules：需要多少有多少；各仅在相关时加载。
- Skills：长度不限；仅按需加载。

## 写出有效的 AGENTS.md

经证明的结构：

```markdown
# Agent Guide — <project>

## What this is
Two sentences. Domain, purpose, key constraint.

## Layout
- src/api — HTTP layer (see .cursor/rules/api.mdc)
- src/core — domain logic, pure functions only
- migrations/ — generated; never edit by hand

## Build & test
- npm run dev / npm test / npm run typecheck
- Tests MUST pass before any commit.

## Conventions
- TypeScript strict; no `any` without a comment.
- Never add dependencies without asking.

## Do not touch
- vendor/, generated/, legacy/payments (frozen for audit)
```

原则：

1. **命令优于描述。**「Run `npm test`」胜过「我们重视测试」。智能体对祈使句行动。
2. **指向，不粘贴。** 链到 scoped rule 或 skill，而非内联细节（「见 `.cursor/rules/api.mdc`」）。
3. **说不要做什么。** 负空间 — 冻结目录、禁止模式 — 阻止最昂贵错误。
4. **保持最新。** 过时的 guide 比没有更糟；智能体自信地遵循。架构变更的 definition of done 应包含审查 `AGENTS.md`。

## 写出正确触发的 rules

Rule 有三项职责：在正确时间应用、足够短可读、足够具体可检查。

**积极 scope。** Rules 最大反模式是对一切 `alwaysApply: true`。每个 always-on rule 对每个请求加载 — 包括修 README typo 的请求。按 glob scope：

```markdown
---
description: React component conventions
globs: src/components/**/*.tsx
---
```

**一 rule 一 concern。** `api.mdc`、`testing.mdc`、`styling.mdc` — 非 `everything.mdc`。小 rules 可 diff、可 review、可独立 scope。

**具体且可检查。**「写好测试」不引导任何事。「`src/core` 每个新 export 在 sibling `__tests__` 需 unit test」可引导 — reviewer（或 sensor）可验证。

**先展示，再说明。** 5 行正确模式代码示例胜过三段描述。

## Skills：程序层

读起来像 *runbook* 的都应放在 skill，非 rule：

- Deploy 与 release 程序
- 数据库迁移工作流
- 「如何端到端添加新 API endpoint」
- 事故调试 playbook

Skill 质量 hinges 于 **description**，因那是智能体决定是否加载时看到的全部。对比：

```yaml
description: Deployment stuff            # never triggers
```

```yaml
description: Use when the user asks to deploy, release, or ship to
  production; covers tagging, the pipeline, rollback, and smoke tests.
```

description 写成触发条件（「Use when…」），≥40 字符，命名用户会说的词。

## Commands：编码团队的动词

Commands 是*人类与智能体同时*的指南：`/review`、`/release`、`/new-endpoint` 以可执行形式记录团队工作方式。好的 command prompt 陈述工作流、质量 bar 与停止条件：

```markdown
# /review

Review the current diff against AGENTS.md and .cursor/rules/.
Report findings ordered by severity with file:line references.
Do not fix anything unless explicitly asked.
```

## Bootstrap 脚本与模板

Fowler 将 bootstrap 工具列在 feedforward 控制中：从已知良好骨架启动智能体的生成器与模板（`npm run new:endpoint`、预装 observability 的服务模板）。模式须精确重复时，生成器胜过模式描述 — 又是 determinism。在 `AGENTS.md` 提及此类脚本，让智能体使用而非手搓。

## 指南如何失败，什么能捕获

| 失败 | 症状 | 对策 |
|---|---|---|
| 过时 guide | 智能体遵循过时约定 | 架构 PR 中审查 harness 文件 |
| 膨胀 context | 智能体忽略 mid-file 指令 | Scope rules；程序移入 skills |
| 模糊引导 | 智能体创造性解释 | 让 rules 具体可检查 |
| 指南被忽略 | 相同错误反复 | 升级到 sensor 或 hook（第 4–5 章） |

最后一行是下一章桥梁：指南是建议，有些建议须变成 **checks**。
