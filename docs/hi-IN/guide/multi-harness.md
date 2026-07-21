# Multi-Harness Support

**v0.4.0** से Harness Score आपके AI coding harness की परिपक्वता **किसी भी tool** पर मापता है — केवल Cursor पर नहीं। चाहे Cursor, Claude Code, Windsurf, Cline, Continue, Codex, या कोई और AI-first IDE या editor उपयोग करें, वही 108-point scoring model लागू होता है।

## Multi-harness support क्यों मायने रखता है

harness tool-agnostic है। अच्छी तरह लिखा `AGENTS.md`, secrets सुरक्षित रखने वाला `.gitignore`, tests चलाने वाला CI pipeline — Cursor, Claude Code, Windsurf या किसी agent के लिए समान रूप से काम करते हैं। एक बार बनाया harness infrastructure आपके project में *हर* AI tool को लाभ देता है।

Harness Score इसे स्पष्ट करता है: एक बार मापें, कोई भी tool लाभ पाता है। Cursor harness और Claude Code harness अलग-अलग नहीं बनाते — *एक harness* बनाते हैं, और हर compatible tool जो समझता है वह हिस्सा inherit करता है।

## कैसे काम करता है: OR semantics

Scanner tool-specific artifacts के लिए **OR semantics** उपयोग करता है। हर check पूछता है "क्या *कोई* recognized tool यह provide करता है?" — "क्या Cursor provide करता है?" नहीं। उदाहरण:

- `.cursor/rules/*.mdc` **या** `.windsurf/rules/*.md` **या** `.clinerules/*.md` **या** nested `CLAUDE.md` → **rules** में गिनता है
- `.cursor/hooks.json` **या** `hooks` section वाला `.claude/settings.json` → **hooks** में गिनता है
- `.cursor/skills/<name>/SKILL.md` **या** `.claude/skills/<name>/SKILL.md` → **skills** में गिनता है
- `.cursor/agents/*.md` **या** `.claude/agents/*.md` **या** `.opencode/agents/*.md` → **subagents** में गिनता है
- root `AGENTS.md` **या** `CLAUDE.md` **या** `GEMINI.md` → **context guides** में गिनता है

सब configure करना ज़रूरी नहीं — एक काफी है। v0.5.0 से दूसरा tool जोड़ने से score कभी *कम* नहीं होता: कई hooks config होने पर सबसे अधिक registered events वाला जीतता है।

## समर्थित tools

Harness Score ये artifacts पहचानता है (exact patterns scanner के harness registry में — [`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)):

| Tool | Rules | Skills | Commands / workflows | Subagents | Hooks | MCP |
|---|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/*.mdc` | `.cursor/skills/*/SKILL.md` | `.cursor/commands/*.md` | `.cursor/agents/*.md` | `.cursor/hooks.json` | `.cursor/mcp.json` |
| **Claude Code** | nested `CLAUDE.md` files | `.claude/skills/*/SKILL.md` | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json` (`hooks` key) | `.mcp.json` |
| **Windsurf** | `.windsurf/rules/*.md` | — | `.windsurf/workflows/*.md` | — | — | — |
| **Cline** | `.clinerules/*.md` | — | — | — | — | — |
| **Continue** | `.continue/rules/*.md` | — | `.continue/prompts/*` | — | — | — |
| **GitHub Copilot** | `.github/instructions/*.instructions.md` | — | — | — | — | — |
| **Codex** | nested `AGENTS.md` files | `.agents/skills/*/SKILL.md` | — | — | — | — |
| **Gemini / Antigravity** | `.agents/rules/`, `.agent/rules/`, `.gemini/rules/`, nested `GEMINI.md` | `.agents/skills/*/SKILL.md` | `.agents/workflows/`, `.agent/workflows/` | — | — | `.agents/mcp_config.json`, `.agent/mcp_config.json` |
| **OpenCode** | — | — | — | `.opencode/agents/*.md` | — | — |
| **Zed** | — | — | `.zed/commands/*.md` | — | — | — |

Root context files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) हर tool के लिए गिनती हैं।
और सबसे महत्वपूर्ण artifacts **tool-agnostic** हैं: tests, CI pipelines, linters, type checkers, `.gitignore`, lockfiles, और `SECURITY.md` — कौन सा tool उपयोग करें, score समान।

::: tip किसी tool का column sparse होना penalty नहीं है
Windsurf के लिए scanner hooks system recognize नहीं करता — पर hooks छह dimensions में से एक हैं। rules, sensors और CI मजबूत Windsurf-only repository भी L3 तक पहुँच सकती है। L4 के लिए gate hooks चाहिए, जिसका मतलब आज `.cursor/hooks.json` या Claude Code `settings.json` primary tool के साथ।
:::

## अपना harness एक बार बनाएँ

Multi-tool repository के लिए typical upgrade path:

1. **एक tool से शुरू करें** (जैसे Cursor)। `AGENTS.md` लिखें, `.cursor/rules/` जोड़ें, sensors (tests, linting, types, CI) setup करें।
2. **टीम दूसरा tool जोड़ती है** (जैसे Claude Code)। shared artifacts — `AGENTS.md`, tests, CI, hygiene — पहले से काम करते हैं। tool-native pieces केवल जहाँ behavior अलग हो: directory-scoped guidance के लिए nested `CLAUDE.md`, hooks के लिए `.claude/settings.json`।
3. **harness एक जगह रहता है।** सभी sensors, guards और guides repo-level — हर tool automatically inherit करता है।
4. **Tools पर नहीं, maturity पर gate करें।** CI `harness-score --min-level 3` चलाता है और हर tool को समान standard पर रखता है।

## प्रोजेक्ट vs user/global harness

**maturity** score केवल repository files गिनता है — जो team PR में review करती है।
वैकल्पिक **effective** `--scope user` या [`.harness-score.json`](./measure-and-improve#scan-configuration)
में `scopes.user` से user-level installs शामिल कर सकता है।

| Location | Examples | maturity में | effective में (enabled) |
|---|---|---|---|
| Repository | `.cursor/`, `AGENTS.md`, CI, tests | Yes | Yes |
| User home | `~/.cursor/…`, `~/.claude/…`, `~/.codeium/windsurf/…`, `~/Documents/Cline/Rules`, `~/.continue/…`, `~/.agents/…`, `~/.zed/…` | No | Yes |
| Shared checkout | Team harness के लिए `extraRoots` | No | Yes |

Global paths tool-wise **allowlisted** हैं — scanner पूरा `$HOME` walk नहीं करता।
Cursor User Rules जो केवल IDE settings UI में हैं, दोनों scores में दिखाई नहीं देते।

### Tool-wise user scope coverage {#user-scope-by-tool}

`--scope user` पर physical paths registry की repo-relative shapes में map होते
हैं ताकि checks repo files की तरह behave करें।

| Tool | User-scope paths (उदाहरण) | Notes |
|---|---|---|
| **Cursor** | `~/.cursor/{skills,commands,agents,rules}`, `~/.cursor/mcp.json` | UI-only User Rules invisible |
| **Claude Code** | `~/.claude/{skills,commands,agents}`, `~/.claude/settings.json`, `~/.mcp.json` | |
| **Windsurf** | `~/.codeium/windsurf/memories/global_rules.md` → `.windsurf/rules/…`, `~/.windsurf/{rules,workflows}/`, MCP alias | Global rules Codeium के अंतर्गत |
| **Cline** | `~/Documents/Cline/Rules/*.md` → `.clinerules/…` | Fallback: `~/Cline/Rules` |
| **Continue** | `~/.continue/{rules,prompts}/` | `config.yaml` inline rules parse नहीं (v1) |
| **Codex / Antigravity** | `~/.agents/{skills,rules,workflows}/`, `~/.agent/…`, `~/.gemini/rules/`, `~/.codex/skills`, `~/.agents/AGENTS.md` | |
| **OpenCode** | `$XDG_CONFIG_HOME/opencode/agents/` | |
| **Zed** | `~/.zed/commands/` | |
| **GitHub Copilot** | — | Repo-only: `.github/instructions/` |

**GitHub Copilot** का documented disk global path नहीं — team instructions repo
में रखें maturity/effective parity के लिए।

पूरी scope table: [Metrics & Codes](./metrics-and-codes#scopes)।

## व्यावहारिक उदाहरण

### Example 1: Cursor-first repo में Claude Code जोड़ना

आपके पास strong Cursor setup वाली repo है:

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

टीम Cursor के साथ Claude Code भी चाहती है। कुछ ज़रूरी नहीं —
score ऊपर सब कुछ पहले से गिनता है। Claude Code sessions को वही guidance देने के लिए जो Cursor `.cursor/rules/` से पाता है, Claude-native equivalents जोड़ें:

- **Directory-scoped guidance**: subdirectories में `CLAUDE.md` रखें जहाँ `.mdc` rules scoped थे (v0.5.0 से nested `CLAUDE.md` scoped rules गिनते हैं)। कई टीमें root `CLAUDE.md` को `AGENTS.md` की one-line pointer — या symlink — बनाती हैं, single source of truth के लिए।
- **Hooks**: gate hook को `.claude/settings.json` में mirror करें (Example 3 देखें)।
- **Subagents**: `.claude/agents/reviewer.md` उसी subagent check में गिनता है जैसे `.cursor/agents/reviewer.md`।

किसी भी तरह Harness Score सबसे strong configuration गिनता है — दूसरा tool जोड़ने से score केवल बना या बढ़ सकता है, कभी कम नहीं।

### Example 2: Greenfield, day one से multi-tool

नया project जो Cursor और Windsurf दोनों उपयोग करेगा। एक बार बनाएँ:

1. root में `AGENTS.md` लिखें।
2. architecture और naming conventions के लिए `.cursor/rules/` बनाएँ।
3. Windsurf को ज़रूरी rules `.windsurf/rules/` में mirror करें (plain markdown, `.mdc` frontmatter नहीं)।
4. tests लिखें, CI configure करें, linter जोड़ें।
5. `npx harness-score` चलाएँ → L2 या उससे ऊपर। दोनों tools equally well-supported।

### Example 3: Safety के लिए hooks (कई tools लाभ)

dangerous shell commands block करने के लिए gate hook जोड़ते हैं। Cursor format में:

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

Claude Code अलग config file और event names उपयोग करता है, पर वही script:

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

Harness Score "Hooks & Guardrails" dimension में किसी एक को reward करता है — gate
events (`beforeShellExecution`, `PreToolUse`) gate-hook checks satisfy करते हैं,
और referenced script repo में actually मौजूद होना चाहिए (committed hook scripts checks validate करने का हिस्सा)। एक script, दो configs, दोनों tools protected।

## स्कोरिंग logic

Scanner हर dimension OR semantics से evaluate करता है, फिर repository को single **maturity level** assign करता है। thresholds (scanner के `LEVEL_REQUIREMENTS` से mirror):

- **L0 · Unharnessed** → default; कोई requirement पूरी नहीं।
- **L1 · Documented** → context ≥ 40% (substantive root guide)।
- **L2 · Guided** → context ≥ 60%, skills ≥ 30% **या** hooks ≥ 30%, hygiene ≥ 50%।
- **L3 · Sensing** → sensors ≥ 60% और CI ≥ 50%।
- **L4 · Self-correcting** → hooks ≥ 70% और total score ≥ 80%।

Level पूरी repository पर लागू, per-tool नहीं। यह जानबूझकर है: developer ने जो tool चुना, AI-assisted work की overall quality बढ़ाना goal है। पूरा model, threshold प्रति rationale, [Maturity Model](./maturity-model) में है।

## Migrations और tool changes

Primary tool बदलें (जैसे Cursor → Claude Code), harness gradually transfer होता है और score cliff-drop नहीं होता:

1. Claude-native artifacts (nested `CLAUDE.md`, `.claude/skills/`, `.claude/settings.json` hooks) existing `.cursor/` config के साथ जोड़ें।
2. `npx harness-score` चलाएँ → **same level**, क्योंकि guides, tests, CI और hygiene tool-agnostic हैं, और दोनों tools के artifacts same checks satisfy करते हैं।
3. जब कोई Cursor उपयोग न करे, पुराना `.cursor/` config deprecate करें (optional — रखने की कोई लागत नहीं)।
4. Harness Score दोनों recognize करता रहता है — regression risk नहीं।

## सीमाएँ और roadmap

**Current (v1.0.0):**

- Plugin support staggered: **Cursor** (flagship, full audit-and-fix), **Claude Code** (Phase 0, read-only audit), बाकी TBD ([PLUGINS-ROADMAP.md](https://github.com/paladini/harness-score/blob/main/PLUGINS-ROADMAP.md) देखें)।
- CLI tool-aware और fully multi-harness: terminal और markdown reports `Detected:` line दिखाते हैं जो हर recognized tool नाम लेती है, `--json` output में `detectedHarnesses` array। Plugins समय के साथ catch up करेंगे।
- Hooks केवल Cursor और Claude Code के लिए recognized — अन्य tools के hook systems (जैसे emerge हों) registry entries चाहिए।

**Planned (post-1.0):**

- Interactive `harness-score init` scaffolding (per tool deterministic templates)।
- Enterprise CI/security tooling के लिए SARIF output।
- Ecosystem detector improvements (और tool variants और config locations recognize)।

## FAQs

**Q: क्या सभी supported tools configure करने होंगे?**

A: नहीं। Cursor configure करें, Harness Score गिनता है। बाद में Claude Code artifacts जोड़ें, दोनों recognized — पर एक well-configured tool score के लिए काफी है।

**Q: केवल Cursor उपयोग करूँ, तो score share कर सकता हूँ?**

A: हाँ। Maturity level repo-level measure है, tool-level नहीं। L3 repository का मतलब "यहाँ AI-assisted work well-gated और verified है" — *कौन सा* tool, specify नहीं करता। बैज share करें तो credible है, चाहे टीम Cursor, Claude Code, या दोनों उपयोग करे।

**Q: मेरा tool list में नहीं है तो?**

A: tool का config format के साथ issue खोलें, support जोड़ देंगे। इस बीच reliable path: (1) `AGENTS.md` + tool-agnostic sensors (tests, linters, types, CI), जो हर जगह काम करते हैं, या (2) अपने tool के harness artifacts को recognized ones से map करें।

**Q: कौन से tools detect हुए, देख सकता हूँ?**

A: हाँ — `npx harness-score --json` में `detectedHarnesses` array। typical CI flow:

```yaml
- name: Audit harness maturity
  run: npx harness-score --min-level 3

- name: Fail if no tool is configured
  run: npx harness-score --json | jq -e '.detectedHarnesses | length > 0'
```

यह ensure करता है maturity gate pass हो *और* कम से कम एक tool का harness recognized हो (`jq -e` non-zero exit जब expression `false` हो)।
