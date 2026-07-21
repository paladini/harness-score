# संदर्भ

इस गाइड में समेकित स्रोत, प्रभाव के क्रम में लगभग।

## Harness engineering

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** — martinfowler.com, अप्रैल 2026.
  एजेंट *उपयोग* करने वाली टीमों के लिए अनुशासन का ढाँचा: guides बनाम sensors, गणनात्मक बनाम अनुमानात्मक checks, तीन नियमन आयाम (रखरखाव, आर्किटेक्चर fitness, व्यवहार), «गुणवत्ता को बाएँ रखें», और harnessability को रिपॉज़िटरी की विशेषता के रूप में।
- **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)** — *Exploring Gen AI* series की प्रारंभिक मेमो जहाँ यह शब्द आकार लेता है।
- **[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)** — LangChain, 2026.
  अनुभवजन्य केस: मॉडल untouched, Terminal Bench 2.0 पर 52.8% → 66.5%। स्व-सत्यापन loops, context assembly middleware, loop detection, reasoning sandwich।
- **[deepagents](https://github.com/langchain-ai/deepagents)** — LangChain का ओपन-सोर्स «batteries-included agent harness»; ठोस harness implementation पढ़ने के लिए उपयोगी।

## टूल दस्तावेज़

### Cursor (flagship)

- **[Rules](https://cursor.com/docs/rules)** — `.cursor/rules/*.mdc`, frontmatter, AGENTS.md।
- **[Agent Skills](https://cursor.com/docs/skills)** — SKILL.md standard और Cursor skills कैसे लोड करता है।
- **[Hooks](https://cursor.com/docs/agent/hooks)** — hooks.json, पूरी event सूची, permission decisions।
- **[Plugins](https://cursor.com/docs/plugins)** — प्लगइन संरचना, manifest, installation modes।
- **[Cursor Marketplace](https://cursor.com/marketplace)** और
  **[plugin spec repository](https://github.com/cursor/plugins)** — प्लगइन package, review, distribute कैसे होते हैं।

### Claude Code, Windsurf, और अन्य

[Multi-Harness Support](./multi-harness) देखें — Harness Score Claude Code (`.claude/agents/`, hooks), Windsurf (`.windsurf/rules/`), Cline (`.clinerules/`), Continue, Codex, और अन्य टूल के समकक्ष artifacts कैसे पहचानता है।

## संबंधित कार्य

- Anthropic effective agents और agent SDKs पर — अधिकांश context-engineering सलाह Cursor harnesses में सीधे transfer होती है।
- Agent Skills open standard — Cursor skills portable क्यों हैं।
- ArchUnit, dependency-cruiser, import-linter — [अध्याय 4](./sensors-feedback) में उल्लिखित architecture fitness functions।

## इस project के बारे में

`harness-score` (scanner, यह गाइड, Cursor प्लगइन, GitHub Action) MIT के तहत ओपन सोर्स:
[github.com/paladini/harness-score](https://github.com/paladini/harness-score)।
रिपॉज़िटरी सब कुछ dogfood करती है — अपने scanner पर L4 स्कोर, CI `--min-level 4` gate।
