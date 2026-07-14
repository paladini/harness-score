/**
 * Per-tool configuration consumed by generate.mjs. Adding a new markdown-only
 * plugin (Windsurf, OpenCode, Cline, Continue.dev, Zed — see
 * PLUGINS-ROADMAP.md) means adding one entry here, not touching the shared
 * recipe prose.
 */
export const TOOLS = {
  cursor: {
    label: 'Cursor',
    pluginDir: 'plugins/cursor',
    // No command frontmatter: the already-submitted (pending review) Cursor
    // Marketplace listing ships this file as-is with none — don't change a
    // proven-working artifact under external review without a reason.
    commandFrontmatter: null,
    skillsDir: '.cursor/skills',
    commandsDir: '.cursor/commands',
    mcpConfigPath: '.cursor/mcp.json',
    ctxRulesSlot: `Then \`.cursor/rules/*.mdc\`, each with frontmatter:

\`\`\`markdown
---
description: <one line>
globs: <path pattern>   # or alwaysApply: true, sparingly
---
- Concrete, checkable bullets. Show a 5-line example of the right pattern.
\`\`\`

One concern per rule. Migrate any legacy \`.cursorrules\` into these.`,
    hooksSlot: `Create \`.cursor/hooks.json\`:

\`\`\`json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard-shell.js", "timeout": 10 }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format-on-edit.js", "timeout": 30 }]
  }
}
\`\`\`

The gate script reads JSON from stdin, tests the command against a
destructive-pattern regex (rm -rf on roots, git push --force, DROP TABLE),
and prints \`{"permission":"deny","userMessage":"…"}\` or
\`{"permission":"allow"}\`. The feedback script runs the project's formatter
on the edited file, best-effort. Commit both scripts. Full examples:
https://paladini.github.io/harness-score/guide/guardrails-and-safety`,
  },
  'claude-code': {
    label: 'Claude Code',
    pluginDir: 'plugins/claude-code',
    // `claude plugin validate` recommends a description for command
    // discovery in the `/` picker — new artifact, no compat risk.
    commandFrontmatter:
      "description: Audit this repository's AI harness maturity with the deterministic harness-score scanner.",
    skillsDir: '.claude/skills',
    commandsDir: '.claude/commands',
    mcpConfigPath: '.mcp.json',
    ctxRulesSlot: `For guidance scoped to part of the tree, add a nested \`CLAUDE.md\`
inside that subdirectory — Claude Code loads it automatically when working
in that subtree, the same idea as glob-scoped rules in other tools, just
directory-scoped instead of pattern-scoped.`,
    hooksSlot: `Register hooks in \`.claude/settings.json\`'s \`"hooks"\` key:

\`\`\`json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "\${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-shell.js" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "\${CLAUDE_PROJECT_DIR}/.claude/hooks/format-on-edit.js" }]
      }
    ]
  }
}
\`\`\`

The gate script reads the tool-call JSON from stdin on \`PreToolUse\`, tests
the command against a destructive-pattern regex (rm -rf on roots, git push
--force, DROP TABLE), and — to block it — prints
\`{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}\`
and exits 0. The feedback script runs on \`PostToolUse\` and formats the
edited file, best-effort. Commit both scripts. Full examples:
https://paladini.github.io/harness-score/guide/guardrails-and-safety`,
  },
};
