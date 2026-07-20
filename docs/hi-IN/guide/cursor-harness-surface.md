# Cursor Harness Surface

Cursor किसी भी mainstream AI editor से अधिक harness machinery expose करता है।
यह अध्याय map है: हर artifact, कहाँ रहता है, और control system में क्या काम करता है।

> **नोट:** Harness Score OR semantics से कई tools (Claude Code, Windsurf, Cline, Continue, और अन्य) support करता है। यह अध्याय Cursor को flagship example के रूप में focus करता है। अन्य tools कैसे recognize और score होते हैं, [Multi-Harness Support](./multi-harness) देखें।

## Artifacts एक नज़र में

| Artifact | Path | Family | Loaded |
|---|---|---|---|
| Agent context file | `AGENTS.md` | Guide | Always |
| Rules | `.cursor/rules/*.mdc` | Guide | Always / by glob / by relevance |
| Skills | `.cursor/skills/*/SKILL.md` | Guide | On demand, by description |
| Commands | `.cursor/commands/*.md` | Guide | Explicitly, via `/name` |
| Hooks | `.cursor/hooks.json` | Sensor + Guardrail | On agent-loop events |
| MCP servers | `.cursor/mcp.json` | Guide (tools) | Per session |
| Subagents | agent definitions | Guide | Delegated tasks |
| Plugins | Marketplace / `.cursor-plugin/` | All bundled | Installed |

सब repository में रहता है — यही point है: **harness code के साथ ship होता है**,
code के साथ version होता है, और code की तरह review होता है।

## AGENTS.md — front door

Repository root पर `AGENTS.md` पहली चीज़ है जो एजेंट पढ़ता है। यह open convention है (Cursor, Claude Code, और ज़्यादातर agentic tools honor करते हैं) और harness में highest-leverage single file। संक्षेप में जवाब दे:

- यह project क्या है और layout कैसा है?
- build, run और **test** कैसे करें?
- कौन सी conventions non-negotiable हैं?
- क्या कभी touch नहीं करना?

~150 lines से कम रखें। हर session पर load होता है — हर line हर task के context window पर tax है। जो details कभी-कभी matter करती हैं, scoped rules या skills में belong करती हैं।

## Rules — persistent, declarative guidance

Rules markdown-with-frontmatter files (`.mdc`) हैं `.cursor/rules/` के अंदर।
हर rule declare करता है *कब apply हो*:

```markdown
---
description: API route conventions
globs: src/api/**
---

- Every route validates input with zod before use.
- Errors return `{ "error": string }` and a correct status code.
```

तीन activation modes:

- `alwaysApply: true` — हर request में inject। true non-negotiables के लिए reserve; हर always-on rule permanent context tax है।
- `globs: <pattern>` — matching files play में हों तब apply। workhorse mode: conventions code के पास रहती हैं जिसे govern करती हैं।
- केवल `description` — एजेंट description से relevance decide करता है।

Nested `.cursor/rules/` directories monorepos में काम करते हैं: package-specific rules package के अंदर रखें।

Legacy single-file `.cursorrules` deprecated है। migrate करें: concern से split, glob से scope।

## Skills — procedural knowledge on demand

Skill एक folder है `SKILL.md` के साथ (open Agent Skills standard):

```markdown
---
name: deploy
description: Use when the user asks to deploy or release; covers tagging,
  pipeline, and smoke tests.
---

# Deploying
1. …step-by-step workflow…
```

Cursor session start पर हर skill का `name` + `description` एजेंट को दिखाता है;
body **केवल तब load** होती है जब एजेंट relevant judge करे। skills long procedural content के लिए सही जगह हैं जो rules bloated कर दे: deploy runbooks, migration recipes, release checklists, debugging playbooks।

Rule of thumb: **rules declarative और always-on-ish ("use strict TypeScript"), skills procedural और on-demand ("here is how we deploy")**। description trigger है — "Use when…" लिखें, नहीं तो fire नहीं होगा।

## Commands — workflows जो deliberately invoke करें

`.cursor/commands/` के अंदर markdown files `/slash-commands` बन जाते हैं। skills (agent-triggered) के unlike, commands **human-triggered** हैं: repeatable workflows keybinding-like surface पर — `/review`, `/release`, `/harness-audit`। command file बस prompt है invoke होने पर चलने वाला।

## Hooks — agent loop observe और control

`.cursor/hooks.json` agent lifecycle events पर scripts register करता है:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard.js" }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format.js" }]
  }
}
```

Scripts stdin पर JSON receive करते हैं और stdout पर answer — gating events के लिए permission decisions (`allow` / `deny` / `ask`) सहित। key events:

- **Gates** (block कर सकते हैं): `beforeShellExecution`, `beforeMCPExecution`,
  `preToolUse`, `beforeReadFile`
- **Feedback** (results observe): `afterFileEdit`, `postToolUse`,
  `afterShellExecution`, `stop`
- **Lifecycle**: `sessionStart` (context inject), `sessionEnd`, `preCompact`

Hooks वही Cursor mechanism है जो *harness runtime द्वारा enforced* है,
*model को suggested* नहीं। rule "never run destructive commands" request है; `beforeShellExecution` hook जो deny करे fact है। अध्याय 5 इस distinction पर build करता है।

## MCP — tools और knowledge

`.cursor/mcp.json` Model Context Protocol servers connect करता है: databases, issue trackers, docs, browsers। harness perspective से MCP guide है (agent *क्या देख और कर* सकता है determine करता है) और risk surface (servers आपके credentials के साथ चलते हैं — secrets inline नहीं; `${ENV_VAR}` interpolation)।

## Subagents — purpose-built delegates {#subagents-purpose-built-delegates}

Subagent `.cursor/agents/` (या plugin के `agents/` folder) के अंदर markdown file है, skill जैसा `name` + `description` frontmatter contract:

```markdown
---
name: reviewer
description: Use when asked to review a pull request or diff for conventions
  in AGENTS.md and .cursor/rules; reports findings by severity without
  editing code.
---

# Reviewer subagent

Read the diff, AGENTS.md, and .cursor/rules/*.mdc. Report violations ordered
by severity. Never modify code — that's the parent agent's job.
```

Skill से distinction: skill *primary* agent को procedure सिखाता है जो inline चलाता है; subagent **अलग delegate** है जिसे primary agent task hand off करता है — अक्सर अपना scoped tool access या narrower job description, ताकि बड़ा task (full repo audit, multi-step release) specialized workers में split हो, एक agent एक context में सब न करे। Cursor की docs इसे "purpose-built" work delegate करना कहती हैं — planner, reviewer, release runner — हर एक की description इतनी tight कि primary agent hand off decide करे बिना guess किए।

Skills जैसा rule description पर: parent agent delegate करे या नहीं decide करने का एकमात्र signal description है, label नहीं — trigger condition लिखें।

## Plugins — harness, packaged

Cursor plugin rules, skills, commands, hooks, agents, और MCP config bundle करता है एक installable unit में `.cursor-plugin/plugin.json` manifest के साथ,
[Cursor Marketplace](https://cursor.com/marketplace) से distribute। plugins harness engineering के लिए matter करते हैं क्योंकि harness patterns **repositories में reusable** बनाते हैं — including
[Harness Score plugin](./measure-and-improve#the-cursor-plugin) जो इस अध्याय के artifacts audit करता है (आज repo directory से install; Marketplace listing pending review)।

## सही mechanism चुनना

| आप चाहते हैं… | Use |
|---|---|
| convention state करें जो हमेशा hold करे | Rule (`alwaysApply`) — sparingly |
| codebase के हिस्से के लिए convention | Rule with `globs` |
| multi-step procedure सिखाएँ | Skill |
| workflow package करें humans trigger करें | Command |
| job delegate करें separate, purpose-built worker को | Subagent |
| model जो सोचे enforce करें | Hook |
| agent को tool या data source दें | MCP server |
| ऊपर सब repos में share करें | Plugin |

Guidance ignore होती रहे, table में *नीचे* shift करें — prose जो model skip कर सकता है, runtime enforce करने वाले mechanisms की ओर।
