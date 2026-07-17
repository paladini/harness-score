# A superfície de harness do Cursor

O Cursor expõe mais maquinaria de harness que qualquer outro editor de IA mainstream.
Este capítulo é o mapa: cada artefato, onde vive e qual trabalho faz no sistema
de controle.

> **Nota:** Harness Score suporta várias ferramentas (Claude Code, Windsurf, Cline, Continue e outras) via semântica OR. Este capítulo foca Cursor como exemplo principal. Veja [Suporte multi-harness](./multi-harness) para como outras ferramentas são reconhecidas e pontuadas.

## Os artefatos em resumo

| Artefato | Caminho | Família | Carregado |
|---|---|---|---|
| Arquivo de contexto do agente | `AGENTS.md` | Guia | Sempre |
| Rules | `.cursor/rules/*.mdc` | Guia | Sempre / por glob / por relevância |
| Skills | `.cursor/skills/*/SKILL.md` | Guia | Sob demanda, por description |
| Commands | `.cursor/commands/*.md` | Guia | Explicitamente, via `/name` |
| Hooks | `.cursor/hooks.json` | Sensor + Guardrail | Em eventos do loop do agente |
| Servidores MCP | `.cursor/mcp.json` | Guia (ferramentas) | Por sessão |
| Subagents | definições de agente | Guia | Tarefas delegadas |
| Plugins | Marketplace / `.cursor-plugin/` | Tudo empacotado | Instalado |

Tudo vive no repositório — esse é o ponto: **o harness viaja com o código**,
é versionado com o código e revisado como código.

## AGENTS.md — a porta da frente

`AGENTS.md` na raiz do repositório é a primeira coisa que um agente lê. É
convenção aberta (Cursor, Claude Code e a maioria das ferramentas agentic
honram) e o arquivo único de maior alavancagem no harness. Deve responder,
brevemente:

- O que é este projeto e como está organizado?
- Como construo, executo e **testo**?
- Quais convenções são inegociáveis?
- O que nunca devo tocar?

Mantenha abaixo de ~150 linhas. Carrega em toda sessão — cada linha taxa a
janela de contexto de toda tarefa. Detalhes que só importam às vezes pertencem
a rules com escopo ou skills.

## Rules — orientação persistente e declarativa

Rules são arquivos markdown com frontmatter (`.mdc`) em `.cursor/rules/`.
Cada rule declara *quando se aplica*:

```markdown
---
description: API route conventions
globs: src/api/**
---

- Every route validates input with zod before use.
- Errors return `{ "error": string }` and a correct status code.
```

Três modos de ativação:

- `alwaysApply: true` — injetado em todo request. Reserve para
  inegociáveis de verdade; toda rule always-on é taxa permanente de contexto.
- `globs: <pattern>` — aplicada quando arquivos correspondentes estão em jogo.
  Modo workhorse: convenções vivem junto do código que governam.
- Só `description` — o agente decide relevância pela description.

Diretórios `.cursor/rules/` aninhados funcionam em monorepos: coloque rules
específicas do pacote dentro do pacote.

O arquivo legado `.cursorrules` está depreciado. Migre: divida por preocupação,
escope por glob.

## Skills — conhecimento procedural sob demanda

Skill é pasta com `SKILL.md` (padrão aberto Agent Skills):

```markdown
---
name: deploy
description: Use when the user asks to deploy or release; covers tagging,
  pipeline, and smoke tests.
---

# Deploying
1. …step-by-step workflow…
```

O Cursor mostra ao agente `name` + `description` de toda skill no início da sessão;
o corpo carrega **só quando o agente julga relevante**. Skills são o lugar certo
para conteúdo procedural longo que incheria rules: runbooks de deploy, receitas
de migração, checklists de release, playbooks de debug.

Regra prática: **rules são declarativas e semi-always-on ("use TypeScript strict"),
skills são procedurais e sob demanda ("aqui está como fazemos deploy")**.
A description é o gatilho — escreva como "Use when…" ou nunca dispara.

## Commands — workflows que você invoca de propósito

Arquivos markdown em `.cursor/commands/` viram `/slash-commands`. Diferente de
skills (disparadas pelo agente), commands são **disparados por humanos**: workflows
repetíveis numa superfície tipo atalho — `/review`, `/release`, `/harness-audit`.
Um arquivo de command é simplesmente o prompt que roda quando invocado.

## Hooks — observar e controlar o loop do agente

`.cursor/hooks.json` registra scripts em eventos do ciclo de vida do agente:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard.js" }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format.js" }]
  }
}
```

Scripts recebem JSON no stdin e respondem no stdout — incluindo decisões de
permissão (`allow` / `deny` / `ask`) para eventos de gate. Eventos-chave:

- **Gates** (podem bloquear): `beforeShellExecution`, `beforeMCPExecution`,
  `preToolUse`, `beforeReadFile`
- **Feedback** (observam resultados): `afterFileEdit`, `postToolUse`,
  `afterShellExecution`, `stop`
- **Lifecycle**: `sessionStart` (injeta contexto), `sessionEnd`, `preCompact`

Hooks são o único mecanismo Cursor *imposto pelo runtime do harness* em vez de
*sugerido ao modelo*. Rule dizendo "nunca rode comandos destrutivos" é pedido;
hook `beforeShellExecution` que nega é fato. O capítulo 5 expande essa distinção.

## MCP — ferramentas e conhecimento

`.cursor/mcp.json` conecta servidores Model Context Protocol: bancos, issue
trackers, docs, browsers. Do ponto de vista do harness MCP é guia (determina o
que o agente *vê e faz*) e superfície de risco (servidores rodam com suas
credenciais — nunca inline secrets; use interpolação `${ENV_VAR}`).

## Subagents — delegados com propósito {#subagents-purpose-built-delegates}

Subagent é arquivo markdown em `.cursor/agents/` (ou pasta `agents/` de plugin)
com o mesmo contrato de frontmatter `name` + `description` de uma skill:

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

Distinção de skill: skill ensina o agente *primário* um procedimento que roda
inline; subagent é **delegado separado** a quem o agente primário passa tarefa —
muitas vezes com acesso a ferramentas mais estreito ou job description menor,
para tarefa grande (auditoria de repo, release multi-step) ser dividida entre
workers especializados em vez de um agente fazer tudo num contexto. A documentação
do Cursor descreve isso como delegar trabalho "purpose-built" — planner, reviewer,
release runner — cada um com description suficientemente apertada para o agente
primário decidir quando delegar sem adivinhar.

Mesma regra das skills na description: é o único sinal que o agente primário usa
para decidir delegar — escreva como condição de gatilho, não rótulo.

## Plugins — o harness, empacotado

Plugin Cursor empacota rules, skills, commands, hooks, agents e config MCP num
unit instalável com manifest `.cursor-plugin/plugin.json`, distribuído pelo
[Cursor Marketplace](https://cursor.com/marketplace). Plugins importam para
engenharia de harness porque tornam padrões de harness **reutilizáveis entre
repositórios** — incluindo o
[plugin Harness Score](./measure-and-improve#the-cursor-plugin) que audita os
artefatos que este capítulo descreveu (instalável do diretório do repo hoje;
listagem Marketplace pendente de revisão).

## Escolhendo o mecanismo certo

| Você quer… | Use |
|---|---|
| Declarar convenção que sempre vale | Rule (`alwaysApply`) — com parcimônia |
| Declarar convenção para parte do codebase | Rule com `globs` |
| Ensinar procedimento multi-step | Skill |
| Empacotar workflow que humanos disparam | Command |
| Delegar job a worker separado com propósito | Subagent |
| Impor algo independente do que o modelo pensa | Hook |
| Dar ferramenta ou fonte de dados ao agente | Servidor MCP |
| Compartilhar tudo isso entre repos | Plugin |

Se uma orientação continua ignorada, mova *para baixo* nesta tabela — de prosa
que o modelo pode pular, para mecanismos que o runtime impõe.
