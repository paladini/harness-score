# Multi-Harness Support

Starting from **v0.4.0**, Harness Score measures the maturity of your AI coding harness across **any tool** — not just Cursor. Whether you're using Cursor, Claude Code, Windsurf, Cline, Continue, Codex, or any other AI-first IDE or editor, the same 108-point scoring model applies.

## Why multi-harness support matters

The harness is tool-agnostic. A well-written `AGENTS.md`, a `.gitignore` that protects secrets, a CI pipeline that runs tests — these work identically for Cursor, Claude Code, Windsurf, or any other agent. The harness infrastructure you build once benefits *every* AI tool in your project.

Harness Score makes this explicit: you measure once, any tool benefits. You don't build a Cursor harness and a Claude Code harness separately — you build *one harness*, and every compatible tool inherits the parts it understands.

## How it works: OR semantics

The scanner uses **OR semantics** for tool-specific artifacts. Each check asks "does *any* recognized tool provide this?" — not "does Cursor provide this?". For example:

- `.cursor/rules/*.mdc` **or** `.windsurf/rules/*.md` **or** `.clinerules/*.md` **or** a nested `CLAUDE.md` → counts toward **rules**
- `.cursor/hooks.json` **or** a `.claude/settings.json` with a `hooks` section → counts toward **hooks**
- `.cursor/skills/<name>/SKILL.md` **or** `.claude/skills/<name>/SKILL.md` → counts toward **skills**
- `.cursor/agents/*.md` **or** `.claude/agents/*.md` **or** `.opencode/agents/*.md` → counts toward **subagents**
- A root `AGENTS.md` **or** `CLAUDE.md` **or** `GEMINI.md` → counts toward **context guides**

You don't need to configure all of them — one is enough. And since v0.5.0, adding a second tool can never *lower* your score: when several hooks configs exist, the one with the most registered events wins.

## Supported tools

Harness Score recognizes these artifacts (the exact patterns live in the scanner's
harness registry — [`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)):

| Tool | Rules | Skills | Commands / workflows | Subagents | Hooks | MCP |
|---|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/*.mdc` | `.cursor/skills/*/SKILL.md` | `.cursor/commands/*.md` | `.cursor/agents/*.md` | `.cursor/hooks.json` | `.cursor/mcp.json` |
| **Claude Code** | nested `CLAUDE.md`, `.claude/rules/**/*.md` | `.claude/skills/*/SKILL.md` | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json` | `.mcp.json` |
| **Windsurf** | `.windsurf/rules/*.md` | `.windsurf/skills/*/SKILL.md` | `.windsurf/workflows/*.md` | - | `.windsurf/hooks.json` | - |
| **Cline** | `.clinerules/**/*.{md,txt}` | `.cline/skills/*/SKILL.md` | - | - | `.clinerules/hooks/<Event>[.ps1]` | - |
| **Continue** | `.continue/rules/*.md` | - | `.continue/prompts/*` | - | - | `.continue/mcpServers/*.{yaml,yml}`, `.continue/config.yaml` |
| **GitHub Copilot** | `.github/instructions/*.instructions.md` | `.github/skills/*/SKILL.md` | `.github/prompts/*.prompt.md` | `.github/agents/*.md` | `.github/hooks/*.json` | - |
| **Codex** | nested `AGENTS.md` files | `.agents/skills/*/SKILL.md` | - | - | - | - |
| **Gemini CLI** | nested `GEMINI.md` | `.gemini/skills/*/SKILL.md` | `.gemini/commands/**/*.toml` | `.gemini/agents/*.md` | `.gemini/settings.json` | `.gemini/settings.json` (`mcpServers`) |
| **Antigravity** | `.agents/rules/`, `.agent/rules/`, `.gemini/rules/` | shared `.agents/skills/` | `.agents/workflows/`, `.agent/workflows/` | - | `.agents/hooks.json` | `.agents/mcp_config.json`, `.agent/mcp_config.json` |
| **OpenCode** | - | `.opencode/skills/*/SKILL.md` | - | `.opencode/agents/*.md` | - | - |
| **Zed** | shared `AGENTS.md` | shared `.agents/skills/` | `.zed/commands/*.md` | - | - | - |
| **Kiro** | `.kiro/steering/**/*.md` | `.kiro/skills/*/SKILL.md` | - | `.kiro/agents/**/*.{md,json}` | `.kiro/hooks/*.json` | `.kiro/settings/mcp.json`, inline agent `mcpServers` |
| **JetBrains Junie** | `.junie/AGENTS.md` | `.junie/skills/*/SKILL.md` | - | `.junie/agents/*.md`, shared `.agents/*.md` | - | - |
| **Roo Code** | `.roo/rules*/`, `.roorules*` | `.roo/skills*/*/SKILL.md` | - | `.roomodes` | - | `.roo/mcp.json` |
| **Devin** | shared `AGENTS.md` | `.cognition/skills/*/SKILL.md` | - | - | - | - |

Root context files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) count for every tool.
And the most important artifacts are **tool-agnostic** anyway: tests, CI pipelines, linters, type checkers, `.gitignore`, lockfiles, and `SECURITY.md` score the same no matter which tool you use.

Shared standards such as `AGENTS.md` and `.agents/skills/` earn points once but
do not identify every compatible vendor as installed. `detectedHarnesses`
only reports a vendor when the repository contains a vendor-specific surface.

The 1.6 registry is grounded in the vendors' repository-format references:
[GitHub Copilot customization](https://docs.github.com/en/copilot/reference/customization-cheat-sheet),
[Claude Code hooks](https://code.claude.com/docs/en/hooks),
[Windsurf hooks](https://docs.windsurf.com/windsurf/cascade/hooks),
[Cline hooks](https://docs.cline.bot/customization/hooks),
[Gemini CLI hooks](https://geminicli.com/docs/hooks/),
[Antigravity hooks](https://ai.google.dev/gemini-api/docs/agent-hooks),
[Kiro hooks](https://kiro.dev/docs/hooks/),
[Junie subagents](https://junie.jetbrains.com/docs/junie-cli-subagents.html),
[Roo Code skills](https://roocodeinc.github.io/Roo-Code/features/skills/), and
[Devin skills](https://docs.devin.ai/product-guides/skills).

::: tip Hook formats are vendor-specific
JSON hook schemas are not interchangeable, and Cline uses executable files.
Harness Score normalizes each format before applying the same HKS-01 through
HKS-05 maturity checks.
:::

## Building your harness once

Here's a typical upgrade path for a multi-tool repository:

1. **Start with one tool** (e.g., Cursor). Write `AGENTS.md`, add `.cursor/rules/`, and set up your sensors (tests, linting, types, CI).
2. **Your team adds a second tool** (e.g., Claude Code). The shared artifacts — `AGENTS.md`, tests, CI, hygiene — already work. Add tool-native pieces only where behavior differs: nested `CLAUDE.md` files for directory-scoped guidance, a `.claude/settings.json` for hooks.
3. **The harness stays in one place.** All sensors, guards, and guides are repo-level — every tool inherits them automatically.
4. **Gate on maturity, not tools.** Your CI runs `harness-score --min-level 3` and holds every tool to the same standard.

## Project vs user/global harness

The **maturity** score counts only files in the repository — what your team
reviews in pull requests. The optional **effective** score can include
user-level installs when you pass `--scope user` or set `scopes.user` in
[`.harness-score.json`](/guide/measure-and-improve#scan-configuration).

| Location | Examples | Counted in maturity | Counted in effective (when enabled) |
|---|---|---|---|
| Repository | `.cursor/`, `AGENTS.md`, CI, tests | Yes | Yes |
| User home | `~/.cursor/…`, `~/.claude/…`, `~/.codeium/windsurf/…`, `~/Documents/Cline/Rules`, `~/.continue/…`, `~/.agents/…`, `~/.zed/…` | No | Yes |
| Shared checkout | `extraRoots` path to team harness repo | No | Yes |

Global paths are **allowlisted** per tool — the scanner never walks all of
`$HOME`. Cursor User Rules stored only in the IDE settings UI are invisible
to both scores.

### User-scope coverage by tool {#user-scope-by-tool}

When `--scope user` is enabled, physical paths are mapped to the same
repo-relative shapes the harness registry uses, so checks behave like repo
files. See [Metrics & Codes — scopes](./metrics-and-codes#scopes) for the
full list.

| Tool | User-scope paths (examples) | Notes |
|---|---|---|
| **Cursor** | `~/.cursor/{skills,commands,agents,rules}`, `~/.cursor/mcp.json` | IDE-only User Rules still invisible |
| **Claude Code** | `~/.claude/{skills,commands,agents}`, `~/.claude/settings.json`, `~/.mcp.json` | |
| **Windsurf** | `~/.codeium/windsurf/memories/global_rules.md` → `.windsurf/rules/…`, `~/.windsurf/{rules,workflows}/`, MCP alias | Global rules live under Codeium, not `.windsurf/` |
| **Cline** | `~/Documents/Cline/Rules/*.md` → `.clinerules/…` | Fallback: `~/Cline/Rules` |
| **Continue** | `~/.continue/{rules,prompts}/` | Inline rules in `config.yaml` not parsed (v1) |
| **Codex / Antigravity** | `~/.agents/{skills,rules,workflows}/`, `~/.agent/…`, `~/.gemini/rules/`, `~/.codex/skills`, `~/.agents/AGENTS.md` | |
| **OpenCode** | `$XDG_CONFIG_HOME/opencode/agents/` | |
| **Zed** | `~/.zed/commands/` | |
| **GitHub Copilot** | — | Repo-only: `.github/instructions/` |

**GitHub Copilot** has no documented on-disk global instructions path — keep
team instructions in the repository for maturity and effective parity.

See the full scope table in [Metrics & Codes](./metrics-and-codes#scopes).

## Practical examples

### Example 1: Cursor-first repo adds Claude Code

You have a repo with a strong Cursor setup:

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

Your team wants to use Claude Code alongside Cursor. Nothing is required —
the score already counts everything above. To give Claude Code sessions the
same guidance Cursor gets from `.cursor/rules/`, add the Claude-native
equivalents:

- **Directory-scoped guidance**: drop a `CLAUDE.md` in the subdirectories your
  `.mdc` rules were scoped to (nested `CLAUDE.md` files count as scoped rules
  since v0.5.0). Many teams make the root `CLAUDE.md` a one-line pointer to
  `AGENTS.md` — or a symlink — so there's a single source of truth.
- **Hooks**: mirror your gate hook into `.claude/settings.json` (see Example 3).
- **Subagents**: `.claude/agents/reviewer.md` counts toward the same subagent
  check as `.cursor/agents/reviewer.md`.

Either way, Harness Score counts the strongest configuration — adding the
second tool can only maintain or raise the score, never lower it.

### Example 2: Greenfield, multi-tool from day one

You're starting a new project that will use both Cursor and Windsurf. Build once:

1. Write `AGENTS.md` in the root.
2. Create `.cursor/rules/` with your architecture and naming conventions.
3. Mirror the rules that Windsurf needs into `.windsurf/rules/` (plain
   markdown, no `.mdc` frontmatter).
4. Write tests, configure CI, add a linter.
5. Run `npx harness-score` → L2 or higher. Both tools are equally well-supported.

### Example 3: Hooks for safety (multiple tools benefit)

You add a gate hook to block dangerous shell commands. In Cursor's format:

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

Claude Code uses a different config file and event names, but the same script:

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

Harness Score rewards either one in the "Hooks & Guardrails" dimension — gate
events (`beforeShellExecution`, `PreToolUse`) satisfy the gate-hook checks,
and the referenced script must actually exist in the repository (committed
hook scripts are part of what the checks validate). One script, two configs,
both tools protected.

## Scoring logic

The scanner evaluates each dimension via OR semantics, then assigns a single **maturity level** to the repository. The thresholds (mirrored from the scanner's `LEVEL_REQUIREMENTS`):

- **L0 · Unharnessed** → the default; no requirements met.
- **L1 · Documented** → context ≥ 40% (a substantive root guide).
- **L2 · Guided** → context ≥ 60%, skills ≥ 30% **or** hooks ≥ 30%, hygiene ≥ 50%.
- **L3 · Sensing** → sensors ≥ 60% and CI ≥ 50%.
- **L4 · Self-correcting** → hooks ≥ 70% and total score ≥ 80%.

The level applies to the entire repository, not per-tool. This is intentional: your goal is to raise the overall quality of AI-assisted work in your project, regardless of which tool the developer picked. The full model, with rationale per threshold, lives in [the Maturity Model](./maturity-model).

## Migrations and tool changes

If you switch primary tools (e.g., Cursor → Claude Code), the harness transfers gradually and the score never cliff-drops:

1. Add the Claude-native artifacts (nested `CLAUDE.md` files, `.claude/skills/`, `.claude/settings.json` hooks) alongside the existing `.cursor/` config.
2. Run `npx harness-score` → **same level**, because guides, tests, CI, and hygiene are tool-agnostic, and both tools' artifacts satisfy the same checks.
3. Deprecate the old `.cursor/` config when nobody uses Cursor anymore (optional — keeping it costs nothing).
4. Harness Score continues to recognize both — no regression risk.

## Limitations and roadmap

**Current (v1.0.0):**

- Plugin support is staggered: **Cursor** (flagship, full audit-and-fix), **Claude Code** (Phase 0, read-only audit), others TBD (see [PLUGINS-ROADMAP.md](https://github.com/paladini/harness-score/blob/main/PLUGINS-ROADMAP.md)).
- The CLI is tool-aware and fully multi-harness: the terminal and markdown reports show a `Detected:` line naming every recognized tool, and `--json` output includes the same list as a `detectedHarnesses` array. Plugins catch up over time.
- Hooks are recognized for Cursor and Claude Code only — other tools' hook systems (as they emerge) need registry entries.

**Planned (post-1.0):**

- Interactive `harness-score init` scaffolding (deterministic templates per tool).
- SARIF output for enterprise CI/security tooling integration.
- Ecosystem detector improvements (recognize more tool variants and config locations).

## FAQs

**Q: Do I need to configure all supported tools?**

A: No. If you configure Cursor, Harness Score counts it. If you later add Claude Code artifacts, both are recognized — but one well-configured tool is enough to score well.

**Q: If I use only Cursor, can I still share my score?**

A: Yes. The maturity level is a repo-level measure, not a tool-level one. A repository at L3 means "AI-assisted work is well-gated and verified here" — it doesn't specify *which* tool. When you share the badge, it's credible whether your team uses Cursor, Claude Code, or both.

**Q: What if my tool isn't listed?**

A: Open an issue with the tool's config format, and we'll add support. The most reliable path in the meantime is to either (1) use `AGENTS.md` + tool-agnostic sensors (tests, linters, types, CI), which work everywhere, or (2) map your tool's harness artifacts to the ones we already recognize.

**Q: Can I see which tools were detected?**

A: Yes — `npx harness-score --json` includes a `detectedHarnesses` array. A typical CI flow:

```yaml
- name: Audit harness maturity
  run: npx harness-score --min-level 3

- name: Fail if no tool is configured
  run: npx harness-score --json | jq -e '.detectedHarnesses | length > 0'
```

This ensures the maturity gate passes *and* at least one tool's harness was recognized (`jq -e` exits non-zero when the expression is `false`).
