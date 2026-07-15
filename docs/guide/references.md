# References

The sources this guide consolidates, roughly in order of influence.

## Harness engineering

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** — martinfowler.com, April 2026.
  The article that framed the discipline for teams *using* agents: guides vs.
  sensors, computational vs. inferential checks, the three regulation
  dimensions (maintainability, architecture fitness, behavior), "keep quality
  left", and harnessability as a property of codebases.
- **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)** — the earlier memo in the
  *Exploring Gen AI* series where the term takes shape.
- **[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)** — LangChain, 2026.
  The empirical case: 52.8% → 66.5% on Terminal Bench 2.0 without touching
  the model. Self-verification loops, context assembly middleware, loop
  detection, and the reasoning sandwich.
- **[deepagents](https://github.com/langchain-ai/deepagents)** — LangChain's
  open-source "batteries-included agent harness"; useful to read as a
  concrete harness implementation.

## Tool documentation

### Cursor (flagship)

- **[Rules](https://cursor.com/docs/rules)** — `.cursor/rules/*.mdc`,
  frontmatter, AGENTS.md.
- **[Agent Skills](https://cursor.com/docs/skills)** — the SKILL.md standard
  and how Cursor loads skills.
- **[Hooks](https://cursor.com/docs/agent/hooks)** — hooks.json, the full
  event list, permission decisions.
- **[Plugins](https://cursor.com/docs/plugins)** — plugin structure,
  manifest, installation modes.
- **[Cursor Marketplace](https://cursor.com/marketplace)** and the
  **[plugin spec repository](https://github.com/cursor/plugins)** — how
  plugins are packaged, reviewed, and distributed.

### Claude Code, Windsurf, and others

See [Multi-Harness Support](/guide/multi-harness) for how Harness Score
recognizes equivalent artifacts from Claude Code (`.claude/agents/`, hooks),
Windsurf (`.windsurf/rules/`), Cline (`.clinerules/`), Continue, Codex, and
other tools.

## Adjacent work

- Anthropic's writing on effective agents and agent SDKs — much of the
  context-engineering advice transfers directly to Cursor harnesses.
- The Agent Skills open standard adopted across tools — the reason skills
  written for Cursor are portable.
- ArchUnit, dependency-cruiser, import-linter — architecture fitness
  functions referenced in [chapter 4](/guide/sensors-feedback).

## About this project

`harness-score` (the scanner, this guide, the Cursor plugin, and the GitHub
Action) is open source under MIT:
[github.com/paladini/harness-score](https://github.com/paladini/harness-score).
The repository dogfoods everything it teaches — it scores L4 on its own
scanner, and its CI gates on `--min-level 4`.
