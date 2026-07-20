# O que é engenharia de harness

> Um agente é um modelo mais um harness. O modelo você aluga; o harness você possui.

Quando um agente de código com IA trabalha no seu repositório, só parte do
comportamento vem do modelo. O resto vem de tudo *ao redor* do modelo: as
instruções que carrega, as ferramentas que pode chamar, as verificações que
rodam na saída, os gates que impedem ações destrutivas. Essa maquinaria ao
redor é o **harness**, e construí-la de forma deliberada é **engenharia de
harness**.

O termo cristalizou no início de 2026. O site de Martin Fowler publicou
[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
(com base em um
[memo](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)
anterior), enquadrando a disciplina para equipes que *usam* agentes. Por
volta da mesma época, a LangChain mostrou o outro lado: melhorando apenas o
harness do agente de código — sem tocar no modelo — passou de **52,8% para
66,5%** no Terminal Bench 2.0, de fora do top 30 para o top 5
([Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)).

A lição central dos dois: **confiabilidade é propriedade do sistema
modelo–harness–ambiente, não dos pesos do modelo**. Um repositório bem
preparado torna um modelo mediano útil; um repositório sem harness torna um
modelo de ponta perigoso.

## Guias e sensores

O framework de Fowler divide os controles do harness em duas famílias,
emprestadas da teoria de controle:

| | **Guias** (feedforward) | **Sensores** (feedback) |
|---|---|---|
| Quando | *Antes* do agente agir | *Depois* do agente agir |
| Propósito | Orientar para bons resultados | Detectar e corrigir os ruins |
| Exemplos (agnósticos de ferramenta) | `AGENTS.md`, rules, skills, commands, contexto MCP | testes, linters, type checkers, CI, hooks |
| Modo de falha quando ausente | Agente adivinha suas convenções | Agente entrega erros com confiança |

Os princípios são os mesmos no Cursor, Claude Code, Windsurf e qualquer outra
ferramenta de código com IA — o que muda é *onde* você configura (diretórios
e formatos de frontmatter diferentes), não *o que* você está construindo. O
Harness Score reconhece essas variantes por **equivalência entre ferramentas** (semântica OR): basta uma ferramenta configurada corretamente para o harness
funcionar em qualquer lugar.

Um harness precisa dos dois. Guias sem sensores produzem saída confiante e
não verificada. Sensores sem guias pegam os mesmos erros repetidamente porque
o agente nunca foi instruído a evitá-los.

## Verificações computacionais vs. inferenciais

Fowler traça uma segunda distinção que este guia — e o scanner
`harness-score` — leva a sério:

- **Verificações computacionais** são determinísticas: linters, type checkers,
  testes, análise estrutural. Rodam em milissegundos a segundos, não custam
  nada e dão a mesma resposta sempre. Pertencem *em todo lugar*: hooks,
  pre-commit, CI.
- **Verificações inferenciais** usam um modelo: code review com IA,
  LLM-as-judge, auditorias semânticas. São poderosas, mas lentas, caras e
  probabilísticas. Use onde a semântica importa e a computação não alcança.

O princípio estratégico é **"manter a qualidade à esquerda"**: empurre as
verificações rápidas, baratas e determinísticas o mais cedo possível no loop,
e reserve julgamento inferencial para o que sobrar. Por isso o
`harness-score` em si é 100% computacional — uma medição de maturidade que
você não consegue reproduzir não é medição.

## O que o harness compra: lições da LangChain

A subida da LangChain no Terminal Bench é o melhor case público de engenharia
de harness como prática empírica. As técnicas que moveram a agulha:

1. **Loops de autoverificação.** O agente deve planejar → implementar →
   testar → corrigir antes de declarar vitória; um middleware de checklist
   pré-conclusão recusa "pronto" sem passagem de verificação. No seu repo, o
   equivalente é ter testes que o agente consegue rodar — e convenções que
   digam para rodá-los.
2. **Montagem de contexto em nome do agente.** O middleware deles mapeia o
   diretório de trabalho no início da sessão para o agente não gastar passos
   explorando. No Cursor, `AGENTS.md` e rules com escopo fazem esse trabalho.
3. **Detecção de loop.** Middleware interrompe "doom loops" em que o agente
   repete a mesma edição falha. Hooks dão o mesmo ponto de observação.
4. **Orçamento de raciocínio em forma de sanduíche.** Máximo de pensamento no
   planejamento e na verificação final, moderado no meio. Você não controla os
   modelos do Cursor, mas controla o que o plano e a verificação *conferem*:
   suas rules e seus testes.

As quatro são propriedades do harness, não do modelo. As quatro têm equivalentes
diretos em um repositório Cursor — é disso que o resto deste guia trata.

## Harnessability: alguns codebases são mais fáceis de preparar

Fowler destaca **affordances ambientes** — propriedades do ambiente que tornam
agentes mais governáveis:

- **Linguagens tipadas** dão a cada edição um sensor gratuito e instantâneo (o
  compilador).
- **Limites de módulo claros** reduzem o contexto que o agente precisa por
  tarefa.
- **Convenções consistentes** transformam guias de ensaios em listas objetivas.
- **Suites de teste rápidas** tornam a autoverificação barata o suficiente
  para ser habitual.

Por isso o [modelo de maturidade](./maturity-model) pontua type checking e
infraestrutura de testes junto com artefatos específicos do Cursor: fazem
parte do mesmo sistema de controle.

## Para onde este guia leva

- O capítulo 2 mapeia a [superfície de harness do Cursor](./cursor-harness-surface) —
  cada arquivo e mecanismo que o Cursor oferece.
- Os capítulos 3–5 cobrem as três famílias de controle em profundidade:
  [Guias](./guides-feedforward), [Sensores](./sensors-feedback) e
  [Guardrails](./guardrails-and-safety).
- O capítulo 6 define um [modelo de maturidade de cinco níveis](./maturity-model)
  com critérios objetivos.
- O capítulo 7 mostra como [medir e melhorar](./measure-and-improve)
  com o scanner `harness-score` e o plugin Cursor.
