# Sensores — controles de feedback

Sensores verificam o que o agente fez. Fecham o loop que torna a autocorreção
possível: um agente com bons sensores corrige os próprios erros antes de você
ver; um agente sem sensores os entrega com um resumo confiante.

## A pilha de sensores

Ordene por velocidade e custo, o mais rápido primeiro — essa ordem *é* o
princípio "manter a qualidade à esquerda":

| Sensor | Latência | Roda em |
|---|---|---|
| Type checker | ms–s | Na edição (hook), pre-commit, CI |
| Linter / formatter | ms–s | Na edição (hook), pre-commit, CI |
| Testes unitários | s | Invocado pelo agente, pre-commit, CI |
| Testes de integração/E2E | min | CI |
| Checks de fitness arquitetural | s–min | CI |
| Code review com IA (inferencial) | min, $ | PR |
| Review humano | horas | PR |

O objetivo não é rodar tudo em todo lugar; é que cada erro seja pego pelo
**sensor mais barato capaz de detectá-lo**, o mais **cedo** possível. Reserve as
duas últimas linhas para o que nada acima consegue ver.

## Type checking: o sensor gratuito

Um type checker estrito é o sensor de maior valor para trabalho com agente
porque roda a cada edição sem custo marginal, é totalmente determinístico, e
suas mensagens de erro são precisas o suficiente para o agente agir sozinho.

- TypeScript: `"strict": true` — TS não-estrito abre mão silenciosamente da
  maior parte do valor.
- Python: mypy ou pyright, no CI, não só no IDE.
- Go, Rust, Java, C#: o compilador já faz isso; garanta que o agente compila
  antes de declarar pronto.

Isso também é argumento de estratégia de linguagem: codebases tipados são
mensuravelmente mais *preparáveis para harness* — o compilador supervisiona
cada edição do agente de graça.

## Testes: o sensor que agentes usam para se autocorrigir

Para um agente, uma suite de testes não é (só) rede de segurança — é a
ferramenta que usa para verificar o próprio trabalho no meio da tarefa. Isso
muda o que "bons testes" significam:

1. **Rápidos.** Uma suite que o agente roda em segundos roda após cada mudança;
   uma de 20 minutos nunca roda. Mantenha um subconjunto rápido (`npm test`)
   mesmo se a suite completa for mais lenta.
2. **Executável com um comando óbvio**, documentado no `AGENTS.md`. Se testes
   precisam de três env vars e um banco, scripte o setup.
3. **Determinísticos.** Testes flaky ensinam agentes (como humanos) a ignorar
   vermelho.
4. **Comportamentais.** Testes que fixam detalhes de implementação bloqueiam
   refactors legítimos; testes que fixam comportamento pegam regressões reais.
   O padrão "approved fixtures" de Fowler — arquivos golden revisados por
   humanos, checados por máquinas — funciona bem em codebases com muitos agentes.

E uma convenção que vale colocar em rule: **comportamento novo chega com teste,
e teste falhando nunca é apagado para ficar verde.** Agentes farão os dois se
permitido.

## Linters: codifique convenções como código

Toda convenção que você expressa como regra de lint é uma convenção que remove
dos arquivos de rules — o linter aplica deterministicamente, com loop de
feedback melhor que prosa. Stacks modernas tornam rules customizadas baratas
(ESLint flat config, Biome, Ruff, custom linters golangci-lint).

Prioridade para trabalho com agente:

- Rules que pegam *deslizes semânticos* (vars não usadas, promises flutuantes,
  erros não tratados) sobre estilo puro.
- Rules auto-fixáveis — pareie com formatter para diffs só com sinal.
- Rules customizadas para o "o agente insiste em fazer X" recorrente do projeto.

## Fitness arquitetural: sensores de estrutura

A segunda dimensão de regulação de Fowler é fitness arquitetural — sensores
que verificam estrutura, não só sintaxe:

- **Regras de dependência**: "core nunca importa de api" — ArchUnit (JVM),
  dependency-cruiser (JS/TS), import-linter (Python).
- **Limites de módulo** em monorepos: checks de boundary Nx/Turborepo.
- **Orçamentos de performance**: limites de bundle, contagem de queries,
  asserções p95.

Isso importa *mais* com agentes do que sem: um agente otimizando tarefa local
viola de boa vontade uma restrição global que nenhum arquivo local menciona.
Fitness checks tornam a restrição global local e imediata.

## Hooks como sensores on-edit

Hooks do Cursor movem sensores de "quando o agente lembrar" para "sempre":

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": "node ./.cursor/hooks/format-on-edit.js", "timeout": 30 }
    ]
  }
}
```

Bons cidadãos de `afterFileEdit`: formatar o arquivo, rodar linter nele, rodar
type checker no pacote — e devolver falhas para o agente corrigir *agora*, in
context, em vez de na CI uma hora depois. Mantenha-os rápidos (sub-segundo onde
possível); hook lento taxa cada edição.

## CI: o sensor de registro

Sensores locais são consultivos — nada força o agente (ou o humano que mergeia
seu trabalho) a tê-los rodado. CI é onde sensores viram **fatos**:

- Rode testes, lint e typecheck a cada push e PR.
- Torne-os checks obrigatórios; PR com CI vermelho do agente é trabalho não
  revisado, não rascunho.
- Adicione `harness-score --min-level N` como job para parar *regressão* de
  harness — falha de drift de config onde alguém apaga hooks.json e ninguém
  percebe ([detalhes no capítulo 7](./measure-and-improve#ci-gate)).

Ferramentas pre-commit (husky + lint-staged, `pre-commit`, lefthook) preenchem
o gap entre hooks on-edit e CI: último check determinístico antes do commit
existir.

## Sensores inferenciais: IA revisando IA

Review baseado em LLM (Bugbot do Cursor, agentes juiz, plugins de review) paga
seu custo no que a computação não checa: essa mudança *significa* a coisa
certa? Essa abstração faz sentido? Duas regras mantêm honestidade:

1. Complementa a pilha computacional, nunca substitui. Reviewer de IA aprovando
   código que não compila é teatro.
2. Achados devem ser *spot-checkable* — prefira reviewers que citam file:line e
   descrevem cenário de falha sobre os que emitem vibes.

## O loop de autocorreção, montado

Com a pilha no lugar, o loop que a LangChain engenhou explicitamente emerge
naturalmente: agente edita → hooks formatam e lintam → roda testes rápidos →
CI reverifica tudo → reviewer inferencial lê os sobreviventes. Cada camada pega
o que a anterior perdeu, e cada captura acontece no ponto mais barato possível.
O que ainda falta é tornar ações perigosas impossíveis em vez de detectáveis —
isso é [Guardrails](./guardrails-and-safety).
