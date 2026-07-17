# Referencias

Las fuentes que esta guía consolida, aproximadamente por orden de influencia.

## Ingeniería de harness

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** — martinfowler.com, abril de 2026.
  El artículo que enmarcó la disciplina para equipos que *usan* agentes: guías vs.
  sensores, verificaciones computacionales vs. inferenciales, las tres dimensiones
  de regulación (mantenibilidad, fitness arquitectónico, comportamiento), "mantener
  la calidad a la izquierda" y harnessability como propiedad de codebases.
- **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)** — el memo anterior de la serie
  *Exploring Gen AI* donde el término toma forma.
- **[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)** — LangChain, 2026.
  El caso empírico: 52,8% → 66,5% en Terminal Bench 2.0 sin tocar el modelo.
  Bucles de autoverificación, middleware de ensamblado de contexto, detección de
  bucles y el sándwich de razonamiento.
- **[deepagents](https://github.com/langchain-ai/deepagents)** — harness de agente
  open source "batteries-included" de LangChain; útil como implementación concreta.

## Documentación de herramientas

### Cursor (principal)

- **[Rules](https://cursor.com/docs/rules)** — `.cursor/rules/*.mdc`,
  frontmatter, AGENTS.md.
- **[Agent Skills](https://cursor.com/docs/skills)** — el estándar SKILL.md
  y cómo Cursor carga skills.
- **[Hooks](https://cursor.com/docs/agent/hooks)** — hooks.json, lista completa
  de eventos, decisiones de permiso.
- **[Plugins](https://cursor.com/docs/plugins)** — estructura de plugin,
  manifest, modos de instalación.
- **[Cursor Marketplace](https://cursor.com/marketplace)** y el
  **[repositorio de spec de plugins](https://github.com/cursor/plugins)** — cómo
  se empaquetan, revisan y distribuyen los plugins.

### Claude Code, Windsurf y otros

Ver [Soporte multi-harness](./multi-harness) para cómo Harness Score
reconoce artefactos equivalentes de Claude Code (`.claude/agents/`, hooks),
Windsurf (`.windsurf/rules/`), Cline (`.clinerules/`), Continue, Codex y
otras herramientas.

## Trabajos adyacentes

- Escritos de Anthropic sobre agentes efectivos y SDKs de agentes — buena parte
  del consejo de context engineering se transfiere directo a harnesses Cursor.
- El estándar abierto Agent Skills adoptado en varias herramientas — razón por
  la que skills escritas para Cursor son portables.
- ArchUnit, dependency-cruiser, import-linter — fitness functions arquitectónicas
  referenciadas en el [capítulo 4](./sensors-feedback).

## Sobre este proyecto

`harness-score` (escáner, guía, plugin Cursor y GitHub Action) es open source
bajo MIT:
[github.com/paladini/harness-score](https://github.com/paladini/harness-score).
El repositorio dogfooda todo lo que enseña — puntúa L4 en su propio escáner, y
el CI exige `--min-level 4`.
