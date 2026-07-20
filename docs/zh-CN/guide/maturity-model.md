# 成熟度模型

本章定义成熟度模型 — 与 [`npx harness-score`](./measure-and-improve) 实现的评估框架完全一致，
因此你在文中读到的等级，都可以测量、复现，并作为门禁标准。

其结构借鉴了常见的能力成熟度模型（DORA *capabilities*、OWASP SAMM *business functions*、CMMI *levels*）：**dimensions** 衡量实践领域，**checks** 是确定性的 pass/fail 指标，**levels** 按 coverage shape 门禁 — 而不只是看 raw percentage。

设计目标：

- **确定性。** 每个 check 都是 filesystem 事实：文件是否存在、能否解析、是否匹配某模式。不调用 model、不做 judgment calls、不访问 network。
- **Harness 无关，Cursor 为旗舰示例。** 任意受支持的 AI-first 工具的 rules、skills、hooks、commands（Cursor、Windsurf、Claude Code、Codex/Antigravity `.agents/`、OpenCode、Cline、Continue、Copilot instructions、Zed）均通过 OR 语义评分 — 配置一个工具即可。Universal harness 基础设施（tests、linters、types、CI）无论 IDE 如何，都构成同一套控制系统。
- **阶梯，而非 grade。** Levels 按 harness *形态*（哪些 dimensions 被覆盖）门禁，而不只看 raw percentage — 八十分的 guides 配零 sensors，称不上 maturity。

## 六个维度

共 108 分，分布在六个 dimensions：

| 维度 | 分数 | 测量内容 |
|---|---|---|
| Context & Guides | 20 | AGENTS.md、rules 质量与 scoping |
| Skills & Commands | 17 | 程序性知识、显式工作流、subagents |
| Hooks & Guardrails | 14 | Runtime 强制的 gates 与 feedback |
| Sensors & Feedback | 20 | Tests、linter、types、formatter |
| CI Feedback | 14 | Pipeline checks、pre-commit |
| Hygiene & Safety | 23 | Secrets、env files、lockfile、license、MCP config |

每个 dimension 由若干 checks 累加而成（完整 catalog 与修复方案见 [第 7 章](./measure-and-improve#the-check-catalog)）。

## 五个等级

### L0 · Unharnessed

仓库没有给智能体提供任何 harness：没有 context file、没有 rules、没有 enforced checks。智能体照样能在这里工作 — 它们总是可以 — 但每个会话都要从零摸索项目，每个错误都会直接进入代码库，除非人类及时发现。大多数仓库都从这里起步。

### L1 · Documented

**要求：Context & Guides ≥ 40%。**

有一份有实质内容的 `AGENTS.md`（或等价物）：项目是什么、如何 build 和 test、约定有哪些。这是从零出发杠杆最高的一步 — 用一个文件为每个未来会话提供 feedforward。

### L2 · Guided

**要求：Context ≥ 60% · (Skills ≥ 30% 或 Hooks ≥ 30%) · Hygiene ≥ 50%。**

Guidance 有了结构：带 valid frontmatter 的 scoped rules（`.cursor/rules/`、`.windsurf/rules/`、`.clinerules/` 或你工具的等价路径），以及程序性知识的起步（skill、command/workflow 或 subagent），或 hook 机制。基本 hygiene 已到位 — env files 被 ignore、harness files 中无 credential signatures。Harness 随代码一并交付，并像代码一样接受 review。

### L3 · Sensing

**要求 L2，且：Sensors ≥ 60% · CI ≥ 50%。**

Feedback 回路已经建立。智能体可以运行 tests，有 linter 和 type checking，CI pipeline 会在每次 push 后重新验证。自纠正从这里开始：智能体可以用确定性工具*检查自己的工作*，pipeline 会捕获它遗漏的部分。对大多数团队来说，L3 是 AI 辅助开发不再让人提心吊胆的转折点。

### L4 · Self-correcting

**要求 L3，且：Hooks ≥ 70% · 总分 ≥ 80%。**

Loop 在 runtime 闭合。Gate hooks 让破坏性操作不可能发生，而不只是「不建议」；feedback hooks 在每次 edit 时执行 lint 和 format，就在会话内完成。Guides、sensors 和 guardrails 覆盖全部六个 dimensions。一个错误现在必须依次通过 rules、on-edit hooks、tests、type checker、CI*以及* gates — 大多数情况下无需人类介入。

## 如何解读分数

两个仓库都可能拿到 65%，但形态可能截然不同 — 这正是 levels 按 dimensions 门禁的原因：

- **65%，guides 满分、无 sensors** → L1。文档写得漂亮，却未经验证。优先补 tests + CI，而不是再加 prose。
- **65%，sensors 很强、无 context** → L0/L1。智能体的产出会被 check，但每个会话都要猜你的约定。优先花一个下午写好 `AGENTS.md`，再加三条 scoped rules。

扫描器会明确打印哪条 requirement 挡住了下一级（`To reach L3: sensors ≥ 60%; ci ≥ 50%`），改进路径不会含糊。

## 模型刻意不测量什么

对 determinism 的边界保持诚实（Fowler 关于「behavior harness 尚不成熟」的 caveat，同样适用于 measurement）：

- **你的 tests 是否足够好** — 只检查是否存在、能否运行、是否 gate。
- **你的 rules 是否仍然正确** — stale rule 与 fresh rule 得分相同。
- **Functional correctness** — 静态 scan 无法验证行为是否正确。
- **Team practice** — branch protection、review culture、agent workflows 都在 repository tree 之外。

高分意味着可靠 agent work 所需的 *infrastructure* 已经具备。这是必要条件，不是充分条件 — 也是 deterministic scanner 能诚实宣称的上限。

## 如何使用这套阶梯

1. 运行 `npx harness-score` — 获取当前等级与具体缺口。
2. 一次只升一级；每一级的 requirements 都是一项聚焦的工作（L1：写 AGENTS.md → L2：rules + hygiene → L3：sensors + CI → L4：hooks）。
3. 在 CI 中 gate 等级（`--min-level`），让 maturity 只能单向提升。
4. 展示成果 — README badge（`harness` · `L4`）与可选的 [share card](./measure-and-improve#show-your-maturity)。同一 pill 可来自 CI（`--badge`）或 pinned static file。

第 7 章会逐步讲解每个步骤，逐项对照 checks。
