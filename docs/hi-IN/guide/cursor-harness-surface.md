# Cursor Harness Surface

Cursor किसी भी mainstream AI editor से अधिक harness machinery expose करता है।
यह अध्याय एक नक्शा है: हर artifact कहाँ रहता है, और control system में क्या भूमिका निभाता है।

> **नोट:** Harness Score OR semantics से कई tools (Claude Code, Windsurf, Cline, Continue, और अन्य) का समर्थन करता है। यह अध्याय Cursor को flagship example के रूप में केंद्रित करता है। अन्य tools कैसे पहचाने और score किए जाते हैं, [Multi-Harness Support](./multi-harness) देखें।

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

सब कुछ रिपॉज़िटरी में रहता है — यही मुख्य बात है: **harness code के साथ ship होता है**,
code के साथ version होता है, और code की तरह review होता है।

Cursor **user-level** artifacts (`~/.cursor/skills`, `~/.cursor/mcp.json`, global commands) भी support करता है जो git में नहीं आते। वे **maturity** score affect नहीं करते (CI reproducible), पर `--scope user` से **effective** बढ़ सकता है — [Multi-harness — project vs global](./multi-harness#project-vs-user-global-harness) और [Metrics & Codes](./metrics-and-codes#scopes) देखें।

## AGENTS.md — मुख्य प्रवेश

रिपॉज़िटरी root पर `AGENTS.md` पहली चीज़ है जो एजेंट पढ़ता है। यह open convention है (Cursor, Claude Code, और ज़्यादातर agentic tools इसे मानते हैं) और harness में सबसे अधिक प्रभाव वाली single file। संक्षेप में इनका उत्तर दें:

- यह project क्या है और layout कैसा है?
- build, run और **test** कैसे करें?
- कौन सी conventions अपरिहार्य हैं?
- क्या कभी छूना नहीं है?

~150 lines से कम रखें। हर session पर load होता है — हर line हर task के context window पर बोझ है। जो विवरण कभी-कभी मायने रखते हैं, scoped rules या skills में रखें।

## Rules — स्थायी, घोषणात्मक मार्गदर्शन

Rules frontmatter सहित markdown files (`.mdc`) हैं `.cursor/rules/` के अंदर।
हर rule घोषित करता है *कब लागू हो*:

```markdown
---
description: API route conventions
globs: src/api/**
---

- Every route validates input with zod before use.
- Errors return `{ "error": string }` and a correct status code.
```

तीन activation modes:

- `alwaysApply: true` — हर request में inject। वास्तव में अपरिहार्य नियमों के लिए ही रखें; हर always-on rule स्थायी context बोझ है।
- `globs: <pattern>` — matching files play में हों तब apply। यह workhorse mode है: conventions उस code के पास रहती हैं जिसे वे नियंत्रित करती हैं।
- केवल `description` — एजेंट description से प्रासंगिकता तय करता है।

Nested `.cursor/rules/` directories monorepos में काम करते हैं: package-specific rules package के अंदर रखें।

Legacy single-file `.cursorrules` deprecated है। migrate करें: concern से split, glob से scope।

## Skills — माँग पर procedural knowledge

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
body **केवल तब load** होती है जब एजेंट relevant समझे। skills long procedural content के लिए सही जगह हैं जो rules bloated कर दे: deploy runbooks, migration recipes, release checklists, debugging playbooks।

अंगूठे का नियम: **rules declarative और always-on-ish ("use strict TypeScript"), skills procedural और on-demand ("here is how we deploy")**। description trigger है — "Use when…" लिखें, नहीं तो fire नहीं होगा।

## Commands — जानबूझकर invoke किए जाने वाले workflows

`.cursor/commands/` के अंदर markdown files `/slash-commands` बन जाते हैं। skills (agent-triggered) के विपरीत, commands **human-triggered** हैं: repeatable workflows keybinding-like surface पर — `/review`, `/release`, `/harness-audit`। command file बस prompt है invoke होने पर चलने वाला।

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

Scripts stdin पर JSON प्राप्त करते हैं और stdout पर उत्तर देते हैं — gating events के लिए permission decisions (`allow` / `deny` / `ask`) सहित। मुख्य events:

- **Gates** (block कर सकते हैं): `beforeShellExecution`, `beforeMCPExecution`,
  `preToolUse`, `beforeReadFile`
- **Feedback** (results observe): `afterFileEdit`, `postToolUse`,
  `afterShellExecution`, `stop`
- **Lifecycle**: `sessionStart` (context inject), `sessionEnd`, `preCompact`

Hooks वही Cursor mechanism है जो *harness runtime द्वारा लागू* होता है,
*model को केवल suggested* नहीं। «never run destructive commands» वाली rule एक अनुरोध है; deny करने वाला `beforeShellExecution` hook एक तथ्य है। अध्याय 5 इस अंतर पर आधारित है।

## MCP — tools और knowledge

`.cursor/mcp.json` Model Context Protocol servers जोड़ता है: databases, issue trackers, docs, browsers। harness perspective से MCP guide है (agent *क्या देख और कर* सकता है यह तय करता है) और risk surface (servers आपके credentials के साथ चलते हैं — secrets inline नहीं; `${ENV_VAR}` interpolation)।

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

Skill से अंतर: skill *primary* agent को procedure सिखाता है जो inline चलाता है; subagent **अलग delegate** है जिसे primary agent task सौंपता है — अक्सर अपना scoped tool access या संकीर्ण job description, ताकि बड़ा task (full repo audit, multi-step release) specialized workers में बँटे, एक agent एक context में सब न करे। Cursor की docs इसे "purpose-built" work delegate करना कहती हैं — planner, reviewer, release runner — हर एक की description इतनी tight कि primary agent बिना अनुमान लगाए hand off तय कर सके।

Skills जैसा rule description पर: parent agent delegate करे या नहीं decide करने का एकमात्र signal description है, label नहीं — trigger condition लिखें।

## Plugins — harness, packaged

Cursor plugin rules, skills, commands, hooks, agents, और MCP config को `.cursor-plugin/plugin.json` manifest के साथ एक installable unit में bundle करता है,
[Cursor Marketplace](https://cursor.com/marketplace) से distribute होता है। plugins harness engineering के लिए महत्वपूर्ण हैं क्योंकि harness patterns **रिपॉज़िटरी में reusable** बनाते हैं — including
[Harness Score plugin](./measure-and-improve#the-cursor-plugin) जो इस अध्याय के artifacts audit करता है (आज repo directory से install; Marketplace listing pending review)।

## सही mechanism चुनना

| आप चाहते हैं… | उपयोग करें |
|---|---|
| convention declare करें जो हमेशा लागू रहे | Rule (`alwaysApply`) — कम उपयोग |
| codebase के हिस्से के लिए convention | Rule with `globs` |
| multi-step procedure सिखाएँ | Skill |
| workflow package करें जो humans trigger करें | Command |
| job delegate करें separate, purpose-built worker को | Subagent |
| model जो सोचे enforce करें | Hook |
| agent को tool या data source दें | MCP server |
| ऊपर सब repos में share करें | Plugin |

Guidance ignore होती रहे, table में *नीचे* shift करें — prose जो model skip कर सकता है, runtime enforce करने वाले mechanisms की ओर।
