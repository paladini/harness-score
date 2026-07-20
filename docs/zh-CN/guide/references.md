# 参考资料

本指南整合的来源，大致按影响顺序排列。

## Harness 工程

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** — martinfowler.com，2026 年 4 月。
  为*使用*智能体的团队框定这一学科的文章：指南 vs 传感器、计算型 vs 推理型检查、三个调节维度（可维护性、架构 fitness、行为）、「质量左移」，以及 harnessability 作为代码库属性。
- **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)** — *Exploring Gen AI* 系列中术语逐渐成型的较早 memo。
- **[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)** — LangChain，2026。
  实证案例：未更换模型，Terminal Bench 2.0 上从 52.8% 提升到 66.5%。自验证循环、上下文组装中间件、循环检测，以及推理三明治。
- **[deepagents](https://github.com/langchain-ai/deepagents)** — LangChain 开源的「开箱即用 agent harness」；可作为具体 harness 实现来阅读。

## 工具文档

### Cursor（旗舰）

- **[Rules](https://cursor.com/docs/rules)** — `.cursor/rules/*.mdc`、frontmatter、AGENTS.md。
- **[Agent Skills](https://cursor.com/docs/skills)** — SKILL.md 标准，以及 Cursor 如何加载 skills。
- **[Hooks](https://cursor.com/docs/agent/hooks)** — hooks.json、完整事件列表、权限决策。
- **[Plugins](https://cursor.com/docs/plugins)** — 插件结构、manifest、安装模式。
- **[Cursor Marketplace](https://cursor.com/marketplace)** 与
  **[插件 spec 仓库](https://github.com/cursor/plugins)** — 插件如何打包、审查与分发。

### Claude Code、Windsurf 及其他

见 [多 harness 支持](./multi-harness)，了解 Harness Score 如何识别 Claude Code（`.claude/agents/`、hooks）、Windsurf（`.windsurf/rules/`）、Cline（`.clinerules/`）、Continue、Codex 等工具的等价 artifact。

## 相关工作

- Anthropic 关于有效智能体与 agent SDK 的著述 — 大量 context engineering 建议可直接迁移到 Cursor harness。
- 跨工具采用的 Agent Skills 开放标准 — 这也是为 Cursor 编写的 skills 可以移植的原因。
- ArchUnit、dependency-cruiser、import-linter — [第 4 章](./sensors-feedback) 引用的架构 fitness 函数。

## 关于本项目

`harness-score`（扫描器、本指南、Cursor 插件与 GitHub Action）在 MIT 下开源：
[github.com/paladini/harness-score](https://github.com/paladini/harness-score)。
本仓库 dogfood 所教的一切 — 自扫描得 L4，CI 以 `--min-level 4` 门禁。
