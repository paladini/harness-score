# 传感器 — Feedback 控制

传感器验证智能体做了什么。它们闭合使自纠正可能的环：有好传感器的智能体在你看到前修复自己的错误；无传感器的智能体带着自信摘要交付错误。

## 传感器栈

按速度与成本排序，最快优先 — 此顺序*即*「质量左移」原则：

| 传感器 | 延迟 | 运行位置 |
|---|---|---|
| Type checker | ms–s | 编辑时（hook）、pre-commit、CI |
| Linter / formatter | ms–s | 编辑时（hook）、pre-commit、CI |
| Unit tests | s | 智能体调用、pre-commit、CI |
| Integration/E2E tests | min | CI |
| Architecture fitness checks | s–min | CI |
| AI code review（推理型） | min, $ | PR |
| Human review | hours | PR |

目标不是处处跑一切；是每个错误被**能检测它的最便宜传感器**、**尽可能早**捕获。两昂贵行留给上面无法看见的内容。

## Type checking：免费传感器

严格 type checker 对智能体工作价值最高，因每次编辑零边际成本运行、完全确定性、错误信息足够精确供智能体自主行动。

- TypeScript：`"strict": true` — 非 strict TS 静默 forfeits 大部分价值。
- Python：mypy 或 pyright，在 CI，非仅 IDE。
- Go、Rust、Java、C#：编译器已做；确保智能体宣布完成前 build。

这也是语言策略论据：类型化代码库 measurably 更 *harnessable* — 编译器免费监督每次智能体编辑。

## Tests：智能体用于自纠正的传感器

对智能体，测试套件不（仅）是安全网 — 是 mid-task 验证自己工作的工具。这改变「好测试」含义：

1. **快。** 智能体秒级可跑的套件每次改后都跑；20 分钟套件永不跑。保留 fast subset（`npm test`）即使 full suite 更慢。
2. **一条 obvious 命令可跑**，在 `AGENTS.md` 文档。若 tests 需三个 env var 与 database，脚本化 setup。
3. **确定性。** Flaky tests 教智能体（像人类）忽略 red。
4. **行为性。** 钉 implementation details 的 tests 阻塞合法 refactor；钉行为的 tests 捕获真回归。Fowler「approved fixtures」模式 — 人类审查的 golden files、机器检查 — 对 agent-heavy 代码库有效。

值得放 rule 的约定：**新行为 landing 带 test，为变绿永不删 failing test。** 允许时智能体会两者都做。

## Linters：约定编码为代码

能表达为 lint rule 的每个约定从 rules 文件删除 — linter 确定性强制执行，反馈环优于 prose。现代栈使 custom rules 廉价（ESLint flat config、Biome、Ruff、golangci-lint custom linters）。

智能体工作优先级：

- 捕获*语义* slip 的规则（unused vars、floating promises、unhandled errors）优于纯 style。
- Auto-fixable rules — 与 formatter 配对，diff 保持 signal-only。
- 项目 recurring「智能体总做 X」的 custom rules。

## Architecture fitness：结构的传感器

Fowler 第二调节维度是 architectural fitness — 验证结构非仅语法的传感器：

- **Dependency rules**：「core 永不 import api」— ArchUnit（JVM）、dependency-cruiser（JS/TS）、import-linter（Python）。
- Monorepo **模块边界**：Nx/Turborepo boundary checks。
- **Performance budgets**：bundle size limits、query counts、p95 assertions。

有智能体时*更*重要：优化局部任务的智能体会 happily 违反无局部文件提及的全局约束。Fitness checks 使全局约束局部且即时。

## Hooks 作为 on-edit 传感器

Cursor hooks 将传感器从「智能体记得时」移到「始终」：

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": "node ./.cursor/hooks/format-on-edit.js", "timeout": 30 }
    ]
  }
}
```

好的 `afterFileEdit` citizen：format 文件、对其跑 linter、对其 package 跑 type checker — 并将失败 surfaced 让智能体*现在*、in-context 修复，而非一小时后 CI。保持快（可能则 sub-second）；慢 hook 税每次编辑。

## CI：记录传感器

本地传感器是 advisory — 无物强制智能体（或 merge 其 work 的人类）已跑。CI 是传感器成为**事实**之处：

- 每次 push 与 PR 跑 tests、lint、typecheck。
- 设为 required checks；CI red 的智能体 PR 是未 review work，非 draft。
- 添加 `harness-score --min-level N` job 阻止 harness *回归* — 某人删 hooks 文件无人注意的 config-drift 失败（[第 7 章详情](./measure-and-improve#ci-gate)）。

Pre-commit 工具（husky + lint-staged、`pre-commit`、lefthook）填 on-edit hooks 与 CI 间 gap：commit 存在前最后确定性 check。

## 推理型传感器：AI 审 AI

LLM review（Cursor Bugbot、judge agents、review plugins）在计算无法检查处挣成本：此变更*是否* mean 对的事？此 abstraction 是否 sane？两条规则保 honest：

1. 补充计算栈，永不替代。AI reviewer 批准不 compile 的 code 是 theater。
2. 发现应 *spot-checkable* —  prefer  cite file:line 并陈述 failure scenario 的 reviewer，而非 emit vibes。

## 自纠正环，组装

栈就位后，LangChain 显式 engineered 的环自然涌现：智能体编辑 → hooks format lint → 跑 fast tests → CI re-verify 一切 → 推理 reviewer 读幸存者。每层捕获前层 missed，每次 catch 在最便宜点。仍缺的是使危险行动 impossible 而非 detectable — 那是 [Guardrails](./guardrails-and-safety)。
