# 什么是 harness 工程

> 智能体 = 模型 + harness。模型是租来的；harness 是你拥有的。

当 AI 编码智能体在你的仓库中工作时，其行为只有一部分来自模型。其余来自模型*周围*的一切：它加载的指令、可调用的工具、对其输出运行的检查、阻止破坏性操作的 gate。这套 surrounding 机制就是 **harness**，刻意构建它就是 **harness 工程**。

该术语在 2026 年初成型。Martin Fowler 网站发表了
[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
（基于更早的
[memo](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)），
为*使用*智能体的团队框定了这一学科。几乎同时，LangChain 展示了另一面：仅改进编码智能体的 harness — 从未动过模型 — 他们在 Terminal Bench 2.0 上从 **52.8% 提升到 66.5%**，从前 30 名之外进入前 5
（[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)）。

两者的核心洞见：**可靠性是模型–harness–环境整个系统的属性，而非模型权重**。准备充分的仓库让 mediocre 模型有用；无 harness 的仓库让 frontier 模型危险。

## 指南与传感器

Fowler 的框架将 harness 控制分为两大家族，借自控制论：

| | **指南**（feedforward） | **传感器**（feedback） |
|---|---|---|
| 时机 | 智能体行动*之前* | 智能体行动*之后* |
| 目的 | 导向良好结果 | 检测并纠正错误 |
| 示例（与工具无关） | `AGENTS.md`、rules、skills、commands、MCP 上下文 | tests、linters、type checkers、CI、hooks |
| 缺失时的失败模式 | 智能体猜测你的约定 | 智能体自信地交付错误 |

原则在 Cursor、Claude Code、Windsurf 及任何其他 AI 编码工具中相同 — 区别在于*在哪里*配置（不同目录与 frontmatter 格式），而非*构建什么*。Harness Score 通过 OR 语义识别这些工具特定变体，让你的 harness 处处可用。

harness 需要两者。无传感器的指南产生自信但未验证的输出。无指南的传感器反复捕获相同错误，因为智能体从未被告知如何避免。

## 计算型 vs 推理型检查

Fowler 划出第二道 distinction，本指南 — 以及 `harness-score` 扫描器 — 认真对待：

- **计算型检查**是确定性的：linters、type checkers、tests、结构分析。毫秒到秒级运行，零成本，每次答案相同。属于*处处*：hooks、pre-commit、CI。
- **推理型检查**使用模型：AI code review、LLM-as-judge、语义审计。强大但慢、贵、概率性。在语义重要且计算无法触及处使用。

战略原则是 **"keep quality left"（质量左移）**：将快速、廉价、确定性的检查尽可能推早到循环中，推理判断留给剩余部分。这也是 `harness-score` 本身 100% 计算型的原因 — 无法复现的成熟度测量不是测量。

## harness 带来的价值：LangChain 的教训

LangChain 在 Terminal Bench 上的攀升是 harness 工程作为实证实践的最佳公开案例。推动指标的技术：

1. **自验证循环。** 智能体必须 plan → implement → test → fix 后才能宣布胜利；pre-completion checklist middleware 在无验证步骤时拒绝「完成」。在你的仓库中，等价物是有智能体实际可运行的 tests — 以及告诉它去运行的约定。
2. **代智能体组装上下文。** 他们的 middleware 在会话开始时映射工作目录，避免智能体浪费步骤探索。在 Cursor 中，`AGENTS.md` 与 scoped rules 承担此职责。
3. **循环检测。** Middleware 中断智能体重复相同失败编辑的「doom loops」。Hooks 提供相同的观察点。
4. **三明治式推理预算。** 规划与最终验证时最大思考，中间适度。你无法控制 Cursor 的模型，但可控制 plan 与 verification *对照什么*：你的 rules 与 tests。

四者都是 harness 属性，非模型属性。四者在 Cursor 仓库中都有直接等价物 — 本指南其余部分即关于此。

## Harnessability：有些代码库更易 harness

Fowler 指出 **ambient affordances** — 使智能体更易治理的环境属性：

- **类型化语言**为每次编辑提供免费、即时传感器（编译器）。
- **清晰模块边界**缩小智能体每任务所需上下文。
- **一致约定**将指南从散文变为要点列表。
- **快速测试套件**使自验证足够廉价而成为习惯。

因此 [成熟度模型](./maturity-model) 将 type checking 与测试基础设施与 Cursor 特定 artifact 一并评分：它们是同一控制系统的一部分。

## 本指南的结构

- 第 2 章映射完整的 [Cursor harness 表面](./cursor-harness-surface) —
  Cursor 提供的每个文件与机制。
- 第 3–5 章深入三大控制家族：
  [指南](./guides-feedforward)、[传感器](./sensors-feedback) 与
  [Guardrails](./guardrails-and-safety)。
- 第 6 章定义带客观标准的 [五级成熟度模型](./maturity-model)。
- 第 7 章展示如何用 `harness-score` 扫描器与 Cursor 插件 [测量与改进](./measure-and-improve)。
