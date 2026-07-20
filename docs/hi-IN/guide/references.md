# संदर्भ

इस guide में समेकित स्रोत, प्रभाव के क्रम में लगभग।

## Harness engineering

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** — martinfowler.com, April 2026.
  Agents *उपयोग* करने वाली teams के लिए discipline frame करने वाला लेख: guides vs sensors, computational vs inferential checks, तीन regulation dimensions (maintainability, architecture fitness, behavior), «keep quality left», और harnessability codebase property के रूप में।
- **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)** — *Exploring Gen AI* series की earlier memo जहाँ term shape लेता है।
- **[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)** — LangChain, 2026.
  Empirical case: model untouched, Terminal Bench 2.0 पर 52.8% → 66.5%। Self-verification loops, context assembly middleware, loop detection, reasoning sandwich।
- **[deepagents](https://github.com/langchain-ai/deepagents)** — LangChain का open-source «batteries-included agent harness»; concrete harness implementation पढ़ने के लिए उपयोगी।

## Tool documentation

### Cursor (flagship)

- **[Rules](https://cursor.com/docs/rules)** — `.cursor/rules/*.mdc`, frontmatter, AGENTS.md।
- **[Agent Skills](https://cursor.com/docs/skills)** — SKILL.md standard और Cursor skills कैसे load करता है।
- **[Hooks](https://cursor.com/docs/agent/hooks)** — hooks.json, full event list, permission decisions।
- **[Plugins](https://cursor.com/docs/plugins)** — plugin structure, manifest, installation modes।
- **[Cursor Marketplace](https://cursor.com/marketplace)** और
  **[plugin spec repository](https://github.com/cursor/plugins)** — plugins package, review, distribute कैसे होते हैं।

### Claude Code, Windsurf, और अन्य

[Multi-Harness Support](./multi-harness) देखें — Harness Score Claude Code (`.claude/agents/`, hooks), Windsurf (`.windsurf/rules/`), Cline (`.clinerules/`), Continue, Codex, और अन्य tools के equivalent artifacts कैसे पहचानता है।

## Adjacent work

- Anthropic effective agents और agent SDKs पर — अधिकांश context-engineering advice Cursor harnesses में सीधे transfer।
- Tools across Agent Skills open standard — Cursor skills portable क्यों हैं।
- ArchUnit, dependency-cruiser, import-linter — [अध्याय 4](./sensors-feedback) में referenced architecture fitness functions।

## इस project के बारे में

`harness-score` (scanner, यह guide, Cursor plugin, GitHub Action) MIT under open source:
[github.com/paladini/harness-score](https://github.com/paladini/harness-score)।
Repository सब कुछ dogfood करती है — अपने scanner पर L4 score, CI `--min-level 4` gate।
