# O modelo de maturidade

Este capítulo define o modelo de maturidade — o mesmo framework de avaliação
implementado por [`npx harness-score`](./measure-and-improve),
para que um nível que você lê aqui seja um nível que você pode medir, reproduzir
e exigir no CI.

A forma segue padrões familiares de maturidade (capacidades DORA, funções de
negócio OWASP SAMM, níveis CMMI): **dimensões** medem áreas de prática,
**checks** são indicadores determinísticos pass/fail, e **níveis** exigem a
*forma* da cobertura — não só uma porcentagem bruta.

Objetivos de design:

- **Determinístico.** Cada check é um fato do filesystem: um arquivo existe,
  parseia, combina com um padrão. Sem modelo, sem julgamento, sem rede.
- **Agnóstico de ferramenta, Cursor como exemplo principal.** Rules, skills,
  hooks e commands de qualquer ferramenta de IA suportada (Cursor, Windsurf,
  Claude Code, Codex/Antigravity `.agents/`, OpenCode, Cline, Continue,
  instruções Copilot, Zed) pontuam via semântica OR — uma ferramenta
  configurada basta. Infraestrutura universal (testes, linters, tipos, CI)
  forma o mesmo sistema de controle independente do IDE.
- **Uma escada, não uma nota.** Níveis exigem a *forma* do harness (quais
  dimensões estão cobertas), não só pontos — 80 pontos de guias com zero
  sensores não é maturidade.

## As seis dimensões

108 pontos em seis dimensões:

| Dimensão | Pontos | O que mede |
|---|---|---|
| Context & Guides | 20 | AGENTS.md, qualidade e escopo de rules |
| Skills & Commands | 17 | Conhecimento procedural, workflows explícitos, subagents |
| Hooks & Guardrails | 14 | Gates e feedback enforced em runtime |
| Sensors & Feedback | 20 | Testes, linter, tipos, formatter |
| CI Feedback | 14 | Checks de pipeline, pre-commit |
| Hygiene & Safety | 23 | Segredos, env files, lockfile, licença, config MCP |

Cada dimensão é a soma de checks individuais (catálogo completo com
remediações no [capítulo 7](./measure-and-improve#the-check-catalog)).

## Os cinco níveis

### L0 · Sem harness

O repositório não dá nada ao agente: sem arquivo de contexto, sem rules, sem
checks enforced. Agentes trabalham aqui — sempre trabalham — mas toda sessão
redescobre o projeto do zero e todo erro segue em frente a menos que um humano
pegue. A maioria dos repositórios começa aqui.

### L1 · Documentado

**Exige: Context & Guides ≥ 40%.**

Há um `AGENTS.md` (ou equivalente) substantivo: o que é o projeto, como
construir e testar, quais convenções valem. O passo de maior alavancagem a
partir do zero — feedforward para toda sessão futura em um arquivo.

### L2 · Orientado

**Exige: Context ≥ 60% · (Skills ≥ 30% ou Hooks ≥ 30%) · Hygiene ≥ 50%.**

A orientação tem estrutura: rules com escopo e frontmatter válido
(`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/` ou equivalente da sua
ferramenta), e pelo menos o início de conhecimento procedural (skill,
command/workflow ou subagent) ou maquinaria de hooks. Higiene básica segura —
env ignorados, sem assinaturas de credencial em arquivos de harness. O harness
agora viaja com o código e é revisado como código.

### L3 · Com sensores

**Exige L2, mais: Sensors ≥ 60% · CI ≥ 50%.**

O loop de feedback existe. Testes que o agente pode rodar, linter, type
checking e pipeline CI que reverifica a cada push. É o nível em que a
autocorreção começa: o agente pode *verificar o próprio trabalho* com
ferramentas determinísticas, e o pipeline pega o que ele perde. Para a maioria
das equipes, L3 é onde desenvolvimento assistido por IA deixa de parecer arriscado.

### L4 · Autocorretivo

**Exige L3, mais: Hooks ≥ 70% · pontuação total ≥ 80%.**

O loop fecha em runtime. Gate hooks tornam ações destrutivas impossíveis em
vez de desencorajadas; feedback hooks lintam e formatam a cada edição, dentro
da sessão. Guias, sensores e guardrails cobrem as seis dimensões. Um erro agora
precisa passar pelas rules, hooks on-edit, testes, type checker, CI *e* gates —
em grande parte sem humano no loop.

## Lendo uma pontuação

Dois repositórios podem ter 65% com formas muito diferentes — por isso os
níveis exigem dimensões:

- **65%, tudo guias, zero sensores** → L1. Lindamente documentado, não
  verificado. Prioridade: testes + CI, não mais prosa.
- **65%, sensores fortes, sem contexto** → L0/L1. O trabalho do agente é
  verificado, mas ele adivinha suas convenções a cada sessão. Prioridade: uma
  tarde em `AGENTS.md` e três rules com escopo.

O scanner imprime exatamente qual requisito bloqueia o próximo nível
(`To reach L3: sensors ≥ 60%; ci ≥ 50%`), então o caminho de melhoria nunca
é ambíguo.

## O que o modelo deliberadamente não mede

Honestidade sobre os limites do determinismo (o caveat de Fowler de que "behavior
harness is immature" vale também para medição):

- **Se seus testes são bons** — só que existem, rodam e gateiam.
- **Se suas rules são verdadeiras** — uma rule obsoleta pontua como uma fresca.
- **Corretude funcional** — nenhum scan estático verifica comportamento.
- **Prática de equipe** — branch protection, cultura de review e workflows de
  agente ficam fora da árvore do repositório.

Pontuação alta significa que a *infraestrutura* para trabalho confiável com
agente existe. É necessária, não suficiente — o teto do que um scanner
determinístico pode afirmar com honestidade.

## Usando a escada

1. Rode `npx harness-score` — obtenha seu nível e os gaps exatos.
2. Suba um nível por vez; os requisitos de cada nível são um esforço focado
   (L1: escrever AGENTS.md → L2: rules + higiene → L3: sensores + CI →
   L4: hooks).
3. Exija o nível no CI (`--min-level`) para a maturidade só subir.
4. Mostre — badge no README (`harness` · `L4`) e [share card](./measure-and-improve#show-your-maturity) opcional. Mesma pílula do CI (`--badge`) ou arquivo estático fixo.

O capítulo 7 percorre cada passo, check a check.
