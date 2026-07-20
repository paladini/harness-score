# 多 harness 支持

自 **v0.4.0** 起，Harness Score 可测量**任意工具**上 AI 编码 harness 的成熟度 — 不限于 Cursor。无论你使用 Cursor、Claude Code、Windsurf、Cline、Continue、Codex，还是其他 AI 优先 IDE 或编辑器，同一套 108 分评分模型均适用。

## 为何多 harness 支持重要

harness 与工具无关。写得好的 `AGENTS.md`、能保护密钥的 `.gitignore`、运行测试的 CI 流水线 — 对 Cursor、Claude Code、Windsurf 或任何其他智能体完全相同。你构建一次的 harness 基础设施，会让项目中的*每一个* AI 工具受益。

Harness Score 把这一点说清楚了：测量一次，任意工具受益。你无需分别构建 Cursor harness 与 Claude Code harness — 你构建*一个 harness*，每个兼容工具继承它所能理解的部分。

## 工作原理：OR 语义

扫描器对工具特定工件使用 **OR 语义**。每项 check 问的是「*任意*已识别工具是否提供此项？」— 而非「Cursor 是否提供？」。例如：

- `.cursor/rules/*.mdc` **或** `.windsurf/rules/*.md` **或** `.clinerules/*.md` **或** 嵌套 `CLAUDE.md` → 计入 **rules**
- `.cursor/hooks.json` **或** 带 `hooks` 节的 `.claude/settings.json` → 计入 **hooks**
- `.cursor/skills/<name>/SKILL.md` **或** `.claude/skills/<name>/SKILL.md` → 计入 **skills**
- `.cursor/agents/*.md` **或** `.claude/agents/*.md` **或** `.opencode/agents/*.md` → 计入 **subagents**
- 根目录 `AGENTS.md` **或** `CLAUDE.md` **或** `GEMINI.md` → 计入 **context guides**

无需全部配置 — 有一个即可。自 v0.5.0 起，添加第二个工具永远不会*降低*分数：存在多个 hooks 配置时，注册事件最多者胜出。

## 支持的工具

Harness Score 识别以下工件（精确模式见扫描器 harness registry — [`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)）：

| 工具 | Rules | Skills | Commands / workflows | Subagents | Hooks | MCP |
|---|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/*.mdc` | `.cursor/skills/*/SKILL.md` | `.cursor/commands/*.md` | `.cursor/agents/*.md` | `.cursor/hooks.json` | `.cursor/mcp.json` |
| **Claude Code** | 嵌套 `CLAUDE.md` | `.claude/skills/*/SKILL.md` | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json`（`hooks` 键） | `.mcp.json` |
| **Windsurf** | `.windsurf/rules/*.md` | — | `.windsurf/workflows/*.md` | — | — | — |
| **Cline** | `.clinerules/*.md` | — | — | — | — | — |
| **Continue** | `.continue/rules/*.md` | — | `.continue/prompts/*` | — | — | — |
| **GitHub Copilot** | `.github/instructions/*.instructions.md` | — | — | — | — | — |
| **Codex** | 嵌套 `AGENTS.md` | `.agents/skills/*/SKILL.md` | — | — | — | — |
| **Gemini / Antigravity** | `.agents/rules/`、`.agent/rules/`、`.gemini/rules/`、嵌套 `GEMINI.md` | `.agents/skills/*/SKILL.md` | `.agents/workflows/`、`.agent/workflows/` | — | — | `.agents/mcp_config.json`、`.agent/mcp_config.json` |
| **OpenCode** | — | — | — | `.opencode/agents/*.md` | — | — |
| **Zed** | — | — | `.zed/commands/*.md` | — | — | — |

根上下文文件（`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`）对所有工具均计数。
而最重要的工件**本就与工具无关**：测试、CI 流水线、linter、类型检查器、`.gitignore`、锁文件与 `SECURITY.md`，无论使用哪种工具，得分方式相同。

::: tip 某工具列较稀疏并非扣分
Windsurf 没有扫描器可识别的 hooks 系统 — 但 hooks 只是六个维度之一。仅有 Windsurf、rules/传感器/CI 配置扎实的仓库，仍可升至 L3。L4 需要门禁 hooks，目前意味着 `.cursor/hooks.json` 或 Claude Code 的 `settings.json` 需与主工具并存。
:::

## 一次构建 harness

多工具仓库的典型升级路径：

1. **从单一工具开始**（如 Cursor）。编写 `AGENTS.md`，添加 `.cursor/rules/`，并配置传感器（测试、lint、类型检查、CI）。
2. **团队引入第二工具**（如 Claude Code）。共享工件 — `AGENTS.md`、测试、CI、卫生项 — 已可直接使用。仅在行为不同时添加工具原生部分：用于目录级引导的嵌套 `CLAUDE.md`、用于 hooks 的 `.claude/settings.json`。
3. **harness 集中在一处。** 所有传感器、护栏与指南都在仓库级 — 每个工具自动继承。
4. **按成熟度门禁，而非按工具。** CI 运行 `harness-score --min-level 3`，对所有工具适用同一标准。

## 实践示例

### 示例 1：以 Cursor 为主的仓库添加 Claude Code

你有一个 Cursor 配置完善的仓库：

```
.cursor/
  rules/
    best-practices.mdc
    architecture.mdc
  hooks.json
  skills/
    refactor/
      SKILL.md
AGENTS.md
```

团队希望与 Cursor 并用 Claude Code。无需额外操作 —
上述配置已全部计入分数。若要让 Claude Code 会话获得与 Cursor 从 `.cursor/rules/` 相同的引导，可添加 Claude 原生等价物：

- **目录级引导**：在原先 `.mdc` rules 按路径生效的子目录中放置 `CLAUDE.md`（自 v0.5.0 起，嵌套 `CLAUDE.md` 计为作用域 rules）。许多团队让根目录 `CLAUDE.md` 仅一行指向 `AGENTS.md` — 或做成符号链接 — 以保持单一事实来源。
- **Hooks**：将门禁 hook 镜像到 `.claude/settings.json`（见示例 3）。
- **Subagents**：`.claude/agents/reviewer.md` 与 `.cursor/agents/reviewer.md` 计入同一子智能体 check。

无论哪种方式，Harness Score 都会取最强配置 — 添加第二工具只能维持或提高分数，不会降低。

### 示例 2：从零开始的多工具项目

新项目将同时使用 Cursor 与 Windsurf。一次构建即可：

1. 在根目录编写 `AGENTS.md`。
2. 创建 `.cursor/rules/`，写入架构与命名约定。
3. 将 Windsurf 需要的 rules 镜像到 `.windsurf/rules/`（纯 Markdown，无 `.mdc` frontmatter）。
4. 编写测试、配置 CI、添加 linter。
5. 运行 `npx harness-score` → 达到 L2 或更高。两种工具均得到同等支持。

### 示例 3：安全 hooks（多工具受益）

添加门禁 hook 以阻止危险的 shell 命令。Cursor 格式：

```json
// .cursor/hooks.json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "./scripts/hooks/gate-shell.sh" }
    ]
  }
}
```

Claude Code 使用不同的配置文件与事件名，但可共用同一脚本：

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/scripts/hooks/gate-shell.sh" }
        ]
      }
    ]
  }
}
```

Harness Score 在「Hooks & Guardrails」维度对任一配置均给分 — 门禁事件（`beforeShellExecution`、`PreToolUse`）满足 gate-hook checks，且引用的脚本必须实际存在于仓库中（已提交的 hook 脚本也是 checks 验证的一部分）。一个脚本、两份配置，两种工具均受保护。

## 评分逻辑

扫描器通过 OR 语义评估各维度，再为仓库分配单一 **成熟度等级**。阈值（与扫描器 `LEVEL_REQUIREMENTS` 一致）：

- **L0 · Unharnessed** → 默认；未满足任何要求。
- **L1 · Documented** → context ≥ 40%（实质性根指南）。
- **L2 · Guided** → context ≥ 60%，skills ≥ 30% **或** hooks ≥ 30%，hygiene ≥ 50%。
- **L3 · Sensing** → sensors ≥ 60% 且 CI ≥ 50%。
- **L4 · Self-correcting** → hooks ≥ 70% 且总分 ≥ 80%。

等级适用于整个仓库，而非按工具分别计算。这是有意为之：目标是提升项目中 AI 辅助工作的整体质量，与开发者选用何种工具无关。完整模型及各阈值理由见 [成熟度模型](./maturity-model)。

## 迁移与工具切换

若切换主工具（如 Cursor → Claude Code），harness 可渐进迁移，分数不会断崖式下跌：

1. 在现有 `.cursor/` 配置旁添加 Claude 原生工件（嵌套 `CLAUDE.md`、`.claude/skills/`、`.claude/settings.json` hooks）。
2. 运行 `npx harness-score` → **等级不变**，因为 guides、测试、CI、卫生项与工具无关，且两种工具的工件满足相同的 checks。
3. 当无人再使用 Cursor 时，弃用旧的 `.cursor/` 配置（可选 — 保留也无成本）。
4. Harness Score 会继续识别两者 — 无回归风险。

## 限制与路线图

**当前（v1.0.0）：**

- 插件支持分阶段推进：**Cursor**（旗舰，完整审计与修复），**Claude Code**（Phase 0，只读审计），其他待定（见 [PLUGINS-ROADMAP.md](https://github.com/paladini/harness-score/blob/main/PLUGINS-ROADMAP.md)）。
- CLI 具备工具感知能力且完全支持多 harness：终端与 Markdown 报告会显示 `Detected:` 行，列出每个已识别工具；`--json` 输出以 `detectedHarnesses` 数组包含相同列表。插件将逐步跟上。
- hooks 目前仅识别 Cursor 与 Claude Code — 其他工具的 hook 系统（随生态出现）需加入 registry。

**计划（1.0 之后）：**

- 交互式 `harness-score init` 脚手架（每工具确定性模板）。
- SARIF 输出，便于企业 CI/安全工具集成。
- 生态检测器改进（识别更多工具变体与配置位置）。

## 常见问题

**问：需要配置所有支持的工具吗？**

答：不需要。若配置了 Cursor，Harness Score 即会计入。之后添加 Claude Code 工件，两者均会被识别 — 但一个配置良好的工具就足以获得高分。

**问：若只用 Cursor，还能分享分数吗？**

答：可以。成熟度是仓库级度量，而非工具级。L3 仓库表示「此处的 AI 辅助工作门禁与验证良好」— 并不指定*哪种*工具。分享徽章时，无论团队使用 Cursor、Claude Code 还是两者并用，均具可信度。

**问：若我的工具未列出怎么办？**

答：请提交 issue 并附上该工具的配置格式，我们会添加支持。在此期间最可靠的路径是：(1) 使用 `AGENTS.md` 加与工具无关的传感器（测试、linter、类型检查、CI），这在各处均适用；或 (2) 将你工具的 harness 工件映射到我们已识别的形式。

**问：能看到检测到哪些工具吗？**

答：可以 — `npx harness-score --json` 包含 `detectedHarnesses` 数组。典型 CI 流程：

```yaml
- name: Audit harness maturity
  run: npx harness-score --min-level 3

- name: Fail if no tool is configured
  run: npx harness-score --json | jq -e '.detectedHarnesses | length > 0'
```

这可确保成熟度门禁通过*且*至少识别到一个工具的 harness（表达式为 `false` 时 `jq -e` 以非零状态退出）。
