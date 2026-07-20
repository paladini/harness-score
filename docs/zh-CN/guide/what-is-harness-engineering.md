# 什么是 harness 工程

> 智能体 = 模型 + harness。模型可以租用；harness 必须自己拥有。

当 AI 编码智能体在你的仓库中工作时，其行为只有一部分来自模型本身。其余来自模型*周围*的一切：它加载的指令、可调用的工具、对输出运行的检查，以及阻止破坏性操作的门禁。这套外围机制就是 **harness**（智能体驾驭层），刻意构建它就是 **harness 工程**。

这一术语在 2026 年初逐渐成型。Martin Fowler 网站发表了
[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
（基于更早的
[memo](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)），
为*使用*智能体的团队框定了这一学科。几乎同时，LangChain 展示了另一面：只改进编码智能体的 harness、从不更换模型，他们在 Terminal Bench 2.0 上从 **52.8% 提升到 66.5%**，从前 30 名之外进入前 5
（[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)）。

两者的核心洞见一致：**可靠性是「模型–harness–环境」整个系统的属性，而不是模型权重本身的属性**。准备充分的仓库能让普通模型发挥价值；没有 harness 的仓库，即使前沿模型也可能带来风险。

## 指南与传感器

Fowler 的框架将 harness 控制分为两大家族，借自控制论：

| | **指南**（feedforward） | **传感器**（feedback） |
|---|---|---|
| 时机 | 智能体行动*之前* | 智能体行动*之后* |
| 目的 | 引导走向正确结果 | 检测并纠正错误 |
| 示例（与工具无关） | `AGENTS.md`、rules、skills、commands、MCP 上下文 | 测试、linter、类型检查、CI、hooks |
| 缺失时的失败模式 | 智能体猜测你的约定 | 智能体自信地交付错误 |

这些原则在 Cursor、Claude Code、Windsurf 及任何其他 AI 编码工具中相同 — 区别只在于*在哪里*配置（目录与 frontmatter 格式不同），而非*构建什么*。Harness Score 通过 **OR 语义**（任一工具满足即可）识别这些工具特定变体，让你的 harness 在不同工具间通用。

harness 需要两者兼备。只有指南、没有传感器，会产生自信但未经验证的输出。只有传感器、没有指南，会反复捕获相同错误，因为智能体从未被告知如何避免。

## 计算型检查 vs 推理型检查

Fowler 还划出第二道界限，本指南 — 以及 `harness-score` 扫描器 — 同样严肃对待：

- **计算型检查**是确定性的：linter、类型检查、测试、结构分析。毫秒到秒级完成，几乎零成本，每次结果相同。应放在*尽可能靠前*的位置：hooks、pre-commit、CI。
- **推理型检查**使用模型：AI 代码审查、LLM-as-judge、语义审计。强大但慢、贵、且带概率性。只在语义重要、计算无法覆盖时使用。

战略原则是 **「质量左移」**：把快速、廉价、确定性的检查尽可能提前，把推理判断留给剩余部分。这也是 `harness-score` 本身 100% 计算型的原因 — 无法复现的成熟度测量，称不上测量。

## harness 能带来的价值：LangChain 的启示

LangChain 在 Terminal Bench 上的提升，是 harness 工程作为实证实践的最佳公开案例。真正推动指标的技术包括：

1. **自验证循环。** 智能体必须经历「规划 → 实现 → 测试 → 修复」才能宣布完成；完成前检查清单的中间件会在缺少验证步骤时拒绝「已完成」。在你的仓库里，等价做法是：有可运行的测试，以及明确要求智能体去跑测试的约定。
2. **代智能体组装上下文。** 其中间件在会话开始时映射工作目录，避免智能体浪费步骤探索文件树。在 Cursor 中，`AGENTS.md` 与带作用域的 rules 承担这一职责。
3. **循环检测。** 中间件会打断智能体反复尝试同一失败编辑的「死循环」。hooks 提供同样的观察点。
4. **三明治式推理预算。** 规划与最终验证阶段投入最多思考，中间适度。你无法控制 Cursor 的模型，但可以控制规划与验证*对照什么*：你的 rules 与 tests。

这四项都是 harness 属性，不是模型属性。它们在 Cursor 仓库中都有直接对应 — 本指南其余章节即围绕此展开。

## 可 harness 化：有些代码库更容易驾驭

Fowler 提到 **环境 affordance**（环境 affordance）— 使智能体更易治理的环境特征：

- **类型化语言**为每次编辑提供免费、即时的传感器（编译器）。
- **清晰的模块边界**缩小智能体每个任务所需的上下文。
- **一致的约定**把指南从长文变成可执行的要点。
- **快速的测试套件**让自验证足够便宜，成为习惯。

因此 [成熟度模型](./maturity-model) 会把类型检查与测试基础设施，与 Cursor 特定工件一并评分：它们属于同一套控制系统。

## 本指南的结构

- 第 2 章梳理完整的 [Cursor harness 表面](./cursor-harness-surface) — Cursor 提供的每个文件与机制。
- 第 3–5 章深入三大控制家族：[指南](./guides-feedforward)、[传感器](./sensors-feedback) 与 [Guardrails](./guardrails-and-safety)。
- 第 6 章定义带客观标准的 [五级成熟度模型](./maturity-model)。
- 第 7 章说明如何用 `harness-score` 扫描器与 Cursor 插件 [测量与改进](./measure-and-improve)。
