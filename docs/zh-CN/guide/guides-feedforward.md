# 指南 — Feedforward 控制

指南在智能体行动*之前*塑造其行为。它们是最廉价的控制：在对的位置写一段文字，就能阻止整类错误。本章讲如何写好它们。

## 上下文经济学

每条指南都在竞争同一稀缺资源：模型的上下文窗口与注意力。热情团队的失败模式往往不是指南太少，而是**字太多** — 智能体草草扫过的两千行 rules、贴进 `AGENTS.md` 的 wiki。LangChain 的 harness 教训在此适用：*代智能体组装上下文* 意味着给它对的 50 行，而非全部 5000 行。

实用预算：

- `AGENTS.md`：≤150 行，始终加载 — 仅放适用于*每个*任务的内容。
- 始终生效的 rules：一两个，各 ≤30 行。
- 按 glob 限定作用域的 rules：需要多少写多少；各条仅在相关时加载。
- Skills：长度不限；仅按需加载。

## 写出有效的 AGENTS.md

经实践验证的结构：

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

1. **命令优于描述。**「运行 `npm test`」胜过「我们重视测试」。智能体对祈使句更敏感。
2. **指向，不粘贴。** 链接到作用域 rule 或 skill，而非内联细节（「见 `.cursor/rules/api.mdc`」）。
3. **说清不要做什么。** 负空间 — 冻结目录、禁止模式 — 能阻止最昂贵的错误。
4. **保持最新。** 过时的指南比没有更糟；智能体会自信地遵循它。架构变更的完成定义中，应包含审查 `AGENTS.md`。

## 写出正确触发的 rules

一条 rule 有三项职责：在正确时间应用、足够短以便阅读、足够具体以便检查。

**积极限定作用域。** rules 最大的反模式是对一切使用 `alwaysApply: true`。每个始终生效的 rule 都会加载到每个请求 — 包括修复 README 错别字的请求。应按 glob 限定：

```markdown
---
description: React component conventions
globs: src/components/**/*.tsx
---
```

**一 rule 一主题。** `api.mdc`、`testing.mdc`、`styling.mdc` — 而非 `everything.mdc`。小 rules 易于 diff、审查，且可独立限定作用域。

**具体且可检查。**「写好测试」引导不了任何事。「`src/core` 中每个新 export 都需在同级 `__tests__` 目录下有单元测试」可以引导 — 审查者（或传感器）也能验证。

**先展示，再说明。** 五行正确模式的代码示例，胜过三段描述。

## Skills：程序层

读起来像*操作手册*的内容，都应放在 skill，而非 rule：

- 部署与发布流程
- 数据库迁移工作流
- 「如何端到端添加新 API 端点」
- 事故调试手册

Skill 质量取决于 **description**，因为那是智能体决定是否加载时看到的全部。对比：

```yaml
description: Deployment stuff            # never triggers
```

```yaml
description: Use when the user asks to deploy, release, or ship to
  production; covers tagging, the pipeline, rollback, and smoke tests.
```

description 应写成触发条件（「Use when…」），≥40 字符，并包含用户会实际说出的词。

## Commands：编码团队的动词

Commands 同时服务于*人与智能体*：`/review`、`/release`、`/new-endpoint` 以可执行形式记录团队的工作方式。好的 command 提示词应说明工作流、质量门槛与停止条件：

```markdown
# /review

Review the current diff against AGENTS.md and .cursor/rules/.
Report findings ordered by severity with file:line references.
Do not fix anything unless explicitly asked.
```

## 引导脚本与模板

Fowler 将引导（bootstrap）工具列为 feedforward 控制：从已知良好骨架启动智能体的生成器与模板（`npm run new:endpoint`、预装可观测性的服务模板）。当某种模式必须精确重复时，生成器胜过对模式的描述 — 又是确定性。在 `AGENTS.md` 中提及此类脚本，让智能体使用它们，而非手工拼凑。

## 指南如何失败，什么能捕获

| 失败 | 症状 | 对策 |
|---|---|---|
| 过时指南 | 智能体遵循过时约定 | 在涉及架构的 PR 中审查 harness 文件 |
| 上下文膨胀 | 智能体忽略文件中部指令 | 限定 rules 作用域；将流程移入 skills |
| 模糊引导 | 智能体自由发挥解读 | 让 rules 具体且可检查 |
| 指南被忽略 | 相同错误反复出现 | 升级到传感器或 hook（第 4–5 章） |

最后一行是通往下一章的桥梁：指南是建议，有些建议需要变成 **checks**。
