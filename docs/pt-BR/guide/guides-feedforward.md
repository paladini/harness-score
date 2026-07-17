# Guias — controles feedforward

Guias moldam o que o agente faz *antes* de agir. São os controles mais baratos
que você tem: um parágrafo no lugar certo evita categorias inteiras de erros.
Este capítulo cobre como escrevê-las bem.

## A economia do contexto

Cada guia compete pelo mesmo recurso escasso: a janela de contexto e a atenção
do modelo. O modo de falha de equipes entusiasmadas não é poucas guias, e sim
**palavras demais** — um arquivo de rules com 2.000 linhas que o modelo só
passa os olhos, uma wiki colada no `AGENTS.md`. A lição de harness da LangChain
aplica aqui: *montar contexto em nome do agente* significa dar as 50 linhas
certas, não todas as 5.000.

Orçamento prático:

- `AGENTS.md`: ≤150 linhas, sempre carregado — só o que vale para *toda* tarefa.
- Rules always-on: uma ou duas, ≤30 linhas cada.
- Rules com escopo por glob: quantas precisar; cada uma carrega só quando relevante.
- Skills: comprimento ilimitado; carregadas só sob demanda.

## Escrevendo um AGENTS.md que funciona

Estrutura que se provou:

```markdown
# Agent Guide — <project>

## What this is
Two sentences. Domain, purpose, key constraint.

## Layout
- src/api — HTTP layer (see .cursor/rules/api.mdc)
- src/core — domain logic, pure functions only
- migrations/ — generated; never edit by hand

## Build & test
- npm run dev / npm test / npm run typecheck
- Tests MUST pass before any commit.

## Conventions
- TypeScript strict; no `any` without a comment.
- Never add dependencies without asking.

## Do not touch
- vendor/, generated/, legacy/payments (frozen for audit)
```

Princípios:

1. **Comandos, não descrições.** "Rode `npm test`" vence "valorizamos testes".
   Agentes agem com imperativos.
2. **Aponte, não cole.** Link para a rule ou skill com escopo em vez de colar
   detalhes ("veja `.cursor/rules/api.mdc`").
3. **Diga o que não fazer.** Espaço negativo — diretórios congelados, padrões
   proibidos — evita os erros mais caros.
4. **Mantenha atual.** Guia obsoleta é pior que nenhuma; o agente segue com
   confiança. Revisar `AGENTS.md` entra na sua definição de pronto para mudanças
   arquiteturais.

## Escrevendo rules que disparam corretamente

Uma rule tem três trabalhos: aplicar no momento certo, ser curta o suficiente
para ser lida, e concreta o suficiente para ser verificável.

**Escopo agressivo.** O maior anti-padrão de rules é `alwaysApply: true` em
tudo. Cada rule always-on carrega em todo request — inclusive para corrigir um
typo no README. Escopo por glob:

```markdown
---
description: React component conventions
globs: src/components/**/*.tsx
---
```

**Uma preocupação por rule.** `api.mdc`, `testing.mdc`, `styling.mdc` — não
`everything.mdc`. Rules pequenas são diffáveis, revisáveis e escopáveis
independentemente.

**Concreta e verificável.** "Escreva bons testes" não orienta nada. "Cada novo
export em `src/core` precisa de teste unitário na pasta `__tests__` irmã"
orienta — e um revisor (ou sensor) pode verificar.

**Mostre, depois diga.** Um exemplo de código de 5 linhas do padrão certo vence
três parágrafos descrevendo-o.

## Skills: a camada procedural

Tudo que parece *runbook* pertence a uma skill, não a uma rule:

- Procedimentos de deploy e release
- Workflows de migração de banco
- "Como adicionar um endpoint de API de ponta a ponta"
- Playbooks de debug de incidentes

A qualidade da skill depende da **description**, porque é tudo que o agente vê
ao decidir carregá-la. Compare:

```yaml
description: Deployment stuff            # never triggers
```

```yaml
description: Use when the user asks to deploy, release, or ship to
  production; covers tagging, the pipeline, rollback, and smoke tests.
```

Escreva descriptions como condições de disparo ("Use when…"), ≥40 caracteres,
com as palavras que um usuário diria de fato.

## Commands: codifique os verbos da equipe

Commands são guias para *humanos e agentes ao mesmo tempo*: `/review`, `/release`,
`/new-endpoint` documentam como a equipe trabalha de forma executável. Um bom
prompt de command declara o workflow, a barra de qualidade e a condição de
parada:

```markdown
# /review

Review the current diff against AGENTS.md and .cursor/rules/.
Report findings ordered by severity with file:line references.
Do not fix anything unless explicitly asked.
```

## Scripts bootstrap e templates

Fowler lista ferramentas bootstrap entre controles feedforward: geradores e
templates que iniciam o agente a partir de um esqueleto conhecido-bom (`npm run
new:endpoint`, template de serviço com observabilidade). Quando um padrão deve
se repetir exatamente, um gerador vence uma descrição do padrão — determinismo
de novo. Mencione esses scripts no `AGENTS.md` para agentes usá-los em vez de
inventar do zero.

## Como guias falham, e o que pega

| Falha | Sintoma | Contramedida |
|---|---|---|
| Guia obsoleta | Agente segue convenção desatualizada | Revisar arquivos de harness em PRs que tocam arquitetura |
| Contexto inchado | Agente ignora instruções no meio do arquivo | Escopar rules; mover procedimentos para skills |
| Orientação vaga | Agente interpreta criativamente | Tornar rules concretas e verificáveis |
| Guia ignorada | Mesmo erro se repete | Escalar para sensor ou hook (capítulos 4–5) |

A última linha é a ponte para o próximo capítulo: guias são sugestões, e algumas
sugestões precisam virar **checks**.
