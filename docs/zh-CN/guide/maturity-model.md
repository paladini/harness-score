# 成熟度模型

本章定义成熟度模型 — 与 [`npx harness-score`](./measure-and-improve) 实现的同一评估框架，
故此处读的等级是可测量、可复现、可门禁的。

形态遵循熟悉的 capability-maturity 模式（DORA *capabilities*、OWASP SAMM *business functions*、CMMI *levels*）：**dimensions** 测量实践领域，**checks** 是确定性 pass/fail 指标，**levels** 按 coverage shape 门禁 — 非仅 raw percentage。

设计目标：

- **确定性。** 每个 check 是 filesystem 事实：文件存在、解析、匹配模式。无 model、无 judgment calls、无 network。
- **Harness 无关，Cursor 为旗舰示例。** 任意支持 AI-first 工具的 rules、skills、hooks、commands（Cursor、Windsurf、Claude Code、Codex/Antigravity `.agents/`、OpenCode、Cline、Continue、Copilot instructions、Zed）通过 OR 语义评分 — 配置一个工具即可。Universal harness 基础设施（tests、linters、types、CI）无论 IDE 形成同一控制系统。
- **阶梯，非 grade。** Levels 按 harness *形态*（哪些 dimensions 覆盖）门禁，非仅 raw percentage — 八十分 guides 零 sensors 不是 maturity。

## 六个维度

108 分跨六个 dimensions：

| 维度 | 分数 | 测量内容 |
|---|---|---|
| Context & Guides | 20 | AGENTS.md、rules 质量与 scoping |
| Skills & Commands | 17 | 程序性知识、显式工作流、subagents |
| Hooks & Guardrails | 14 | Runtime 强制的 gates 与 feedback |
| Sensors & Feedback | 20 | Tests、linter、types、formatter |
| CI Feedback | 14 | Pipeline checks、pre-commit |
| Hygiene & Safety | 23 | Secrets、env files、lockfile、license、MCP config |

每个 dimension 是个别 checks 之和（完整 catalog 与修复方案见 [第 7 章](./measure-and-improve#the-check-catalog)）。

## 五个等级

### L0 · Unharnessed

仓库给智能体 nothing：无 context file、无 rules、无 enforced checks。智能体在此工作 — 总是 — 但每会话从零 rediscover 项目，每个错误 ship 除非人类 catch。多数仓库从此开始。

### L1 · Documented

**要求：Context & Guides ≥ 40%。**

有实质性 `AGENTS.md`（或等价物）：项目是什么、如何 build test、约定是什么。从零最高杠杆一步 — 一个文件 feedforward 给每个未来会话。

### L2 · Guided

**要求：Context ≥ 60% · (Skills ≥ 30% 或 Hooks ≥ 30%) · Hygiene ≥ 50%。**

Guidance 有结构：带 valid frontmatter 的 scoped rules（`.cursor/rules/`、`.windsurf/rules/`、`.clinerules/` 或工具等价物），及至少程序性知识开端（skill、command/workflow 或 subagent）或 hook 机制。基本 hygiene hold — env files ignored、harness files 无 credential signatures。Harness 现与代码一起 ship，像代码一样 review。

### L3 · Sensing

**要求 L2，加：Sensors ≥ 60% · CI ≥ 50%。**

Feedback loop 存在。智能体可跑的 tests、linter、type checking、re-verify 每次 push 的 CI pipeline。自纠正开始的等级：智能体可用确定性工具 *check 自己 work*，pipeline catch 其 missed。对多数团队，L3 是 AI 辅助开发 stop feeling risky 之处。

### L4 · Self-correcting

**要求 L3，加：Hooks ≥ 70% · 总分 ≥ 80%。**

Loop 在 runtime 闭合。Gate hooks 使 destructive actions impossible 而非 discouraged；feedback hooks 每次 edit lint format，in session。Guides、sensors、guardrails 覆盖六 dimensions。错误现须 past rules、on-edit hooks、tests、type checker、CI *与* gates — 大多无 human in loop。

## 读分数

两仓库都可 65% 但 shape 很不同 — 故 levels 按 dimensions 门禁：

- **65%，全 guides 无 sensors** → L1。文档漂亮，未验证。优先：tests + CI，非更多 prose。
- **65%，强 sensors 无 context** → L0/L1。Work 被 check 但每会话 guess 约定。优先：一个下午 `AGENTS.md` 与三条 scoped rules。

扫描器打印 exactly 哪条 requirement 阻塞下一级（`To reach L3: sensors ≥ 60%; ci ≥ 50%`），改进路径 never ambiguous。

## 模型故意不测量什么

对 determinism limits 的 honest（Fowler「behavior harness immature」caveat 也适用于 measurement）：

- **你的 tests 是否 good** — 仅存在、运行、gate。
- **你的 rules 是否 true** — stale rule 与 fresh 同分。
- **Functional correctness** — 无 static scan 可 verify behavior。
- **Team practice** — branch protection、review culture、agent workflows live 在 repository tree 外。

高分意味着可靠 agent work 的 *infrastructure* 存在。Necessary 非 sufficient — deterministic scanner 能 honestly claim 的上限。

## 使用阶梯

1. 运行 `npx harness-score` — 得等级与 exact gaps。
2. 一次升一级；每级 requirements 是一次 focused effort（L1：写 AGENTS.md → L2：rules + hygiene → L3：sensors + CI → L4：hooks）。
3. CI 门禁等级（`--min-level`）使 maturity 只 ratchet up。
4. 展示 — README badge（`harness` · `L4`）与可选 [share card](./measure-and-improve#show-your-maturity)。同一 pill 来自 CI（`--badge`）或 pinned static file。

第 7 章逐步 walk，check by check。
