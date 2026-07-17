# Referências

As fontes que este guia consolida, aproximadamente por ordem de influência.

## Engenharia de harness

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** — martinfowler.com, abril de 2026.
  O artigo que enquadrou a disciplina para equipes que *usam* agentes: guias vs.
  sensores, verificações computacionais vs. inferenciais, as três dimensões de
  regulação (manutenibilidade, fitness arquitetural, comportamento), "manter a
  qualidade à esquerda" e harnessability como propriedade de codebases.
- **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)** — o memo anterior da série
  *Exploring Gen AI* onde o termo toma forma.
- **[Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)** — LangChain, 2026.
  O caso empírico: 52,8% → 66,5% no Terminal Bench 2.0 sem tocar no modelo.
  Loops de autoverificação, middleware de montagem de contexto, detecção de loop
  e o sanduíche de raciocínio.
- **[deepagents](https://github.com/langchain-ai/deepagents)** — harness de agente
  open source "batteries-included" da LangChain; útil como implementação concreta.

## Documentação de ferramentas

### Cursor (principal)

- **[Rules](https://cursor.com/docs/rules)** — `.cursor/rules/*.mdc`,
  frontmatter, AGENTS.md.
- **[Agent Skills](https://cursor.com/docs/skills)** — o padrão SKILL.md
  e como o Cursor carrega skills.
- **[Hooks](https://cursor.com/docs/agent/hooks)** — hooks.json, lista completa
  de eventos, decisões de permissão.
- **[Plugins](https://cursor.com/docs/plugins)** — estrutura de plugin,
  manifest, modos de instalação.
- **[Cursor Marketplace](https://cursor.com/marketplace)** e o
  **[repositório de spec de plugins](https://github.com/cursor/plugins)** — como
  plugins são empacotados, revisados e distribuídos.

### Claude Code, Windsurf e outros

Veja [Suporte multi-harness](./multi-harness) para como o Harness Score
reconhece artefatos equivalentes do Claude Code (`.claude/agents/`, hooks),
Windsurf (`.windsurf/rules/`), Cline (`.clinerules/`), Continue, Codex e
outras ferramentas.

## Trabalhos adjacentes

- Escritos da Anthropic sobre agentes eficazes e SDKs de agentes — boa parte
  do conselho de context engineering transfere diretamente para harnesses Cursor.
- O padrão aberto Agent Skills adotado em várias ferramentas — motivo pelo qual
  skills escritas para Cursor são portáveis.
- ArchUnit, dependency-cruiser, import-linter — fitness functions arquiteturais
  referenciadas no [capítulo 4](./sensors-feedback).

## Sobre este projeto

`harness-score` (scanner, guia, plugin Cursor e GitHub Action) é open source
sob MIT:
[github.com/paladini/harness-score](https://github.com/paladini/harness-score).
O repositório dogfooda tudo que ensina — pontua L4 no próprio scanner, e o CI
exige `--min-level 4`.
