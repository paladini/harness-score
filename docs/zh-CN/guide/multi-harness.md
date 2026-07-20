# 多 harness 支持

自 **v0.4.0** 起，Harness Score 测量**任意工具**上 AI 编码 harness 的成熟度 — 不限于 Cursor。无论你使用 Cursor、Claude Code、Windsurf、Cline、Continue、Codex 还是其他 AI 优先 IDE 或编辑器，同一 108 分评分模型均适用。

## 为何多 harness 支持重要

harness 与工具无关。写得好的 `AGENTS.md`、保护密钥的 `.gitignore`、运行 tests 的 CI 流水线 — 对 Cursor、Claude Code、Windsurf 或任何其他智能体完全相同。你构建一次的 harness 基础设施让项目中*每个* AI 工具受益。

Harness Score 将此显式化：测量一次，任意工具受益。你无需分别构建 Cursor harness 与 Claude Code harness — 你构建*一个 harness*，每个兼容工具继承它理解的部分。

## 工作原理：OR 语义

扫描器对工具特定 artifact 使用 **OR 语义**。每项 check 问「*任意*已识别工具是否提供此项？」— 而非「Cursor 是否提供？」。例如：

- `.cursor/rules/*.mdc` **或** `.windsurf/rules/*.md` **或** `.clinerules/*.md` **或** 嵌套 `CLAUDE.md` → 计入 **rules**
- `.cursor/hooks.json` **或** 带 `hooks` 节的 `.claude/settings.json` → 计入 **hooks**
- `.cursor/skills/<name>/SKILL.md` **或** `.claude/skills/<name>/SKILL.md` → 计入 **skills**
- `.cursor/agents/*.md` **或** `.claude/agents/*.md` **或** `.opencode/agents/*.md` → 计入 **subagents**
- 根 `AGENTS.md` **或** `CLAUDE.md` **或** `GEMINI.md` → 计入 **context guides**

无需全部配置 — 一个即可。自 v0.5.0 起，添加第二个工具永远不会*降低*分数：存在多个 hooks 配置时，注册事件最多者胜出。

## 支持的工具

Harness Score 识别这些 artifact（精确模式在扫描器 harness registry — [`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)）：

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

根上下文文件（`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`）对所有工具计数。
最重要的 artifact  anyway **与工具无关**：tests、CI、linters、type checkers、`.gitignore`、lockfile 与 `SECURITY.md` 无论用何工具分数相同。

::: tip 某工具列稀疏不是惩罚
Windsurf 无扫描器可识别的 hooks 系统 — 但 hooks 只是六个维度之一。仅有 Windsurf、rules/传感器/CI 强的仓库仍可升至 L3。L4 需要 gate hooks，目前意味着 `.cursor/hooks.json` 或 Claude Code `settings.json` 与主工具并存。
:::

## 一次构建 harness

多工具仓库的典型升级路径：

1. **从单一工具开始**（如 Cursor）。写 `AGENTS.md`，添加 `.cursor/rules/`，设置传感器（tests、linting、types、CI）。
2. **团队添加第二工具**（如 Claude Code）。共享 artifact — `AGENTS.md`、tests、CI、卫生 — 已可用。仅在行为不同时添加工具原生部分：目录 scoped 的嵌套 `CLAUDE.md`、用于 hooks 的 `.claude/settings.json`。
3. **harness 留在一处。** 所有传感器、guard 与指南在 repo 级 — 每个工具自动继承。
4. **按成熟度门禁，非按工具。** CI 运行 `harness-score --min-level 3`，对所有工具同一标准。

## 实践示例

### 示例 1：Cursor 优先仓库添加 Claude Code

你有强 Cursor 设置的仓库：

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

团队想与 Cursor 并用 Claude Code。无需额外操作 —
分数已计入上述一切。要让 Claude Code 会话获得 Cursor 从 `.cursor/rules/` 得到的相同引导，添加 Claude 原生等价物：

- **目录 scoped 引导**：在 `.mdc` rules 曾 scoped 的子目录放置 `CLAUDE.md`（自 v0.5.0 嵌套 `CLAUDE.md` 计为 scoped rules）。许多团队让根 `CLAUDE.md` 一行指向 `AGENTS.md` — 或 symlink — 保持单一真相源。
- **Hooks**：将 gate hook 镜像到 `.claude/settings.json`（见示例 3）。
- **Subagents**：`.claude/agents/reviewer.md` 与 `.cursor/agents/reviewer.md` 计入同一 subagent check。

无论哪种，Harness Score 计最强配置 — 添加第二工具只能维持或提高分数，不会降低。

### 示例 2：绿地，首日多工具

新项目将同时使用 Cursor 与 Windsurf。一次构建：

1. 在根写 `AGENTS.md`。
2. 用架构与命名约定创建 `.cursor/rules/`。
3. Windsurf 需要的 rules 镜像到 `.windsurf/rules/`（纯 markdown，无 `.mdc` frontmatter）。
4. 写 tests、配置 CI、添加 linter。
5. 运行 `npx harness-score` → L2 或更高。两工具同等支持。

### 示例 3：安全 hooks（多工具受益）

添加 gate hook 阻止危险 shell 命令。Cursor 格式：

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

Claude Code 用不同配置文件与事件名，但同一脚本：

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

Harness Score 在「Hooks & Guardrails」维度奖励任一 — gate 事件（`beforeShellExecution`、`PreToolUse`）满足 gate-hook checks，引用的脚本须实际存在于仓库（已提交的 hook 脚本是 checks 验证的一部分）。一个脚本、两个配置，两工具受保护。

## 评分逻辑

扫描器通过 OR 语义评估各维度，再为仓库分配单一 **成熟度等级**。阈值（与扫描器 `LEVEL_REQUIREMENTS` 一致）：

- **L0 · Unharnessed** → 默认；无要求满足。
- **L1 · Documented** → context ≥ 40%（实质性根指南）。
- **L2 · Guided** → context ≥ 60%，skills ≥ 30% **或** hooks ≥ 30%，hygiene ≥ 50%。
- **L3 · Sensing** → sensors ≥ 60% 且 CI ≥ 50%。
- **L4 · Self-correcting** → hooks ≥ 70% 且总分 ≥ 80%。

等级适用于整个仓库，非 per-tool。有意为之：目标是提升项目中 AI 辅助工作的整体质量，与开发者选何工具无关。完整模型与各阈值理由见 [成熟度模型](./maturity-model)。

## 迁移与工具切换

若切换主工具（如 Cursor → Claude Code），harness 渐进迁移，分数不会断崖：

1. 在现有 `.cursor/` 配置旁添加 Claude 原生 artifact（嵌套 `CLAUDE.md`、`.claude/skills/`、`.claude/settings.json` hooks）。
2. 运行 `npx harness-score` → **同级**，因 guides、tests、CI、hygiene 与工具无关，两工具 artifact 满足相同 checks。
3. 无人再用 Cursor 时弃用旧 `.cursor/` 配置（可选 — 保留无成本）。
4. Harness Score 继续识别两者 — 无回归风险。

## 限制与路线图

**当前（v1.0.0）：**

- 插件支持分阶段：**Cursor**（旗舰，完整 audit-and-fix），**Claude Code**（Phase 0，只读 audit），其他 TBD（见 [PLUGINS-ROADMAP.md](https://github.com/paladini/harness-score/blob/main/PLUGINS-ROADMAP.md)）。
- CLI 工具感知且完全 multi-harness：终端与 markdown 报告显示 `Detected:` 行列出每个已识别工具，`--json` 输出含相同列表为 `detectedHarnesses` 数组。插件逐步跟上。
- Hooks 仅 Cursor 与 Claude Code 识别 — 其他工具 hook 系统（随出现）需 registry 条目。

**计划（1.0 后）：**

- 交互式 `harness-score init` 脚手架（每工具确定性模板）。
- SARIF 输出用于企业 CI/安全工具集成。
- 生态检测器改进（识别更多工具变体与配置位置）。

## 常见问题

**问：需要配置所有支持的工具吗？**

答：否。若配置 Cursor，Harness Score 即计数。之后添加 Claude Code artifact，两者均识别 — 但一个配置良好的工具足以得高分。

**问：若只用 Cursor，还能分享分数吗？**

答：能。成熟度是 repo 级度量，非 tool 级。L3 仓库表示「此处 AI 辅助工作门禁与验证良好」— 不指定*哪个*工具。分享徽章时，无论团队用 Cursor、Claude Code 或两者，均可信。

**问：若我的工具未列出？**

答：开 issue 附上工具配置格式，我们会添加支持。在此期间最可靠路径是 (1) 使用 `AGENTS.md` + 与工具无关的传感器（tests、linters、types、CI），处处可用，或 (2) 将工具 harness artifact 映射到我们已识别的。

**问：能看到检测到哪些工具吗？**

答：能 — `npx harness-score --json` 含 `detectedHarnesses` 数组。典型 CI 流程：

```yaml
- name: Audit harness maturity
  run: npx harness-score --min-level 3

- name: Fail if no tool is configured
  run: npx harness-score --json | jq -e '.detectedHarnesses | length > 0'
```

这确保成熟度门禁通过*且*至少识别一个工具的 harness（表达式为 `false` 时 `jq -e` 非零退出）。
