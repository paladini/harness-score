# Suporte multi-harness

A partir da **v0.4.0**, o Harness Score mede a maturidade do harness de código com IA em **qualquer ferramenta** — não só Cursor. Seja Cursor, Claude Code, Windsurf, Cline, Continue, Codex ou outro IDE/editor AI-first, o mesmo modelo de 108 pontos se aplica.

## Por que multi-harness importa

O harness é agnóstico de ferramenta. Um `AGENTS.md` bem escrito, um `.gitignore` que protege segredos, um pipeline CI que roda testes — funcionam igual para Cursor, Claude Code, Windsurf ou qualquer outro agente. A infraestrutura de harness que você constrói uma vez beneficia *toda* ferramenta de IA no projeto.

O Harness Score torna isso explícito: você mede uma vez, qualquer ferramenta se beneficia. Você não constrói harness Cursor e harness Claude Code separados — constrói *um harness*, e cada ferramenta compatível herda as partes que entende.

## Como funciona: semântica OR

O scanner usa **semântica OR** para artefatos específicos de ferramenta. Cada check pergunta "alguma ferramenta reconhecida fornece isso?" — não "o Cursor fornece?". Por exemplo:

- `.cursor/rules/*.mdc` **ou** `.windsurf/rules/*.md` **ou** `.clinerules/*.md` **ou** um `CLAUDE.md` aninhado → conta para **rules**
- `.cursor/hooks.json` **ou** `.claude/settings.json` com seção `hooks` → conta para **hooks**
- `.cursor/skills/<name>/SKILL.md` **ou** `.claude/skills/<name>/SKILL.md` → conta para **skills**
- `.cursor/agents/*.md` **ou** `.claude/agents/*.md` **ou** `.opencode/agents/*.md` → conta para **subagents**
- `AGENTS.md` na raiz **ou** `CLAUDE.md` **ou** `GEMINI.md` → conta para **guias de contexto**

Você não precisa configurar todos — um basta. Desde v0.5.0, adicionar segunda ferramenta nunca *abaixa* sua pontuação: quando várias configs de hooks existem, vence a com mais eventos registrados.

## Ferramentas suportadas

O Harness Score reconhece estes artefatos (padrões exatos no registry do scanner —
[`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)):

| Ferramenta | Rules | Skills | Commands / workflows | Subagents | Hooks | MCP |
|---|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/*.mdc` | `.cursor/skills/*/SKILL.md` | `.cursor/commands/*.md` | `.cursor/agents/*.md` | `.cursor/hooks.json` | `.cursor/mcp.json` |
| **Claude Code** | `CLAUDE.md` aninhados | `.claude/skills/*/SKILL.md` | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json` (`hooks`) | `.mcp.json` |
| **Windsurf** | `.windsurf/rules/*.md` | — | `.windsurf/workflows/*.md` | — | — | — |
| **Cline** | `.clinerules/*.md` | — | — | — | — | — |
| **Continue** | `.continue/rules/*.md` | — | `.continue/prompts/*` | — | — | — |
| **GitHub Copilot** | `.github/instructions/*.instructions.md` | — | — | — | — | — |
| **Codex** | `AGENTS.md` aninhados | `.agents/skills/*/SKILL.md` | — | — | — | — |
| **Gemini / Antigravity** | `.agents/rules/`, `.agent/rules/`, `.gemini/rules/`, `GEMINI.md` aninhados | `.agents/skills/*/SKILL.md` | `.agents/workflows/`, `.agent/workflows/` | — | — | `.agents/mcp_config.json`, `.agent/mcp_config.json` |
| **OpenCode** | — | — | — | `.opencode/agents/*.md` | — | — |
| **Zed** | — | — | `.zed/commands/*.md` | — | — | — |

Arquivos de contexto na raiz (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) contam para toda ferramenta.
E os artefatos mais importantes são **agnósticos de ferramenta**: testes, CI, linters, type checkers, `.gitignore`, lockfiles e `SECURITY.md` pontuam igual independente da ferramenta.

::: tip Coluna esparça de uma ferramenta não é penalidade
Windsurf não tem sistema de hooks reconhecido pelo scanner — mas hooks são só uma dimensão de seis. Repositório só Windsurf com rules, sensores e CI fortes ainda sobe a L3. L4 exige gate hooks, o que hoje significa `.cursor/hooks.json` ou `settings.json` do Claude Code junto da ferramenta principal.
:::

## Construindo o harness uma vez

Caminho típico de upgrade para repositório multi-ferramenta:

1. **Comece com uma ferramenta** (ex.: Cursor). Escreva `AGENTS.md`, adicione `.cursor/rules/`, configure sensores (testes, lint, tipos, CI).
2. **A equipe adiciona segunda ferramenta** (ex.: Claude Code). Artefatos compartilhados — `AGENTS.md`, testes, CI, higiene — já funcionam. Adicione peças nativas só onde o comportamento difere: `CLAUDE.md` aninhados para orientação por diretório, `.claude/settings.json` para hooks.
3. **O harness fica num lugar.** Sensores, guardrails e guias são nível repo — toda ferramenta herda automaticamente.
4. **Exija maturidade, não ferramentas.** CI roda `harness-score --min-level 3` e segura todas na mesma barra.

## Exemplos práticos

### Exemplo 1: Repo Cursor-first adiciona Claude Code

Você tem repo com setup Cursor forte:

```
.cursor/
  rules/
    best-practices.mdc
    architecture.mdc
  hooks.json
  skills/
    refactor/
      SKILL.md
AGENTS.md
```

A equipe quer usar Claude Code junto do Cursor. Nada é obrigatório —
a pontuação já conta tudo acima. Para dar às sessões Claude Code a mesma
orientação que Cursor recebe de `.cursor/rules/`, adicione equivalentes nativos:

- **Orientação por diretório**: coloque `CLAUDE.md` nos subdiretórios onde suas
  rules `.mdc` tinham escopo (`CLAUDE.md` aninhados contam como rules com escopo
  desde v0.5.0). Muitas equipes fazem o `CLAUDE.md` raiz apontar em uma linha
  para `AGENTS.md` — ou symlink — para fonte única de verdade.
- **Hooks**: espelhe seu gate hook em `.claude/settings.json` (veja Exemplo 3).
- **Subagents**: `.claude/agents/reviewer.md` conta para o mesmo check que
  `.cursor/agents/reviewer.md`.

De qualquer forma, Harness Score conta a config mais forte — adicionar segunda
ferramenta só mantém ou eleva a pontuação, nunca abaixa.

### Exemplo 2: Greenfield, multi-ferramenta desde o dia um

Projeto novo que usará Cursor e Windsurf. Construa uma vez:

1. Escreva `AGENTS.md` na raiz.
2. Crie `.cursor/rules/` com convenções de arquitetura e nomenclatura.
3. Espelhe rules que Windsurf precisa em `.windsurf/rules/` (markdown
   simples, sem frontmatter `.mdc`).
4. Escreva testes, configure CI, adicione linter.
5. Rode `npx harness-score` → L2 ou mais. Ambas ferramentas igualmente suportadas.

### Exemplo 3: Hooks para segurança (várias ferramentas beneficiadas)

Você adiciona gate hook para bloquear comandos shell perigosos. Formato Cursor:

```json
// .cursor/hooks.json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "./scripts/hooks/gate-shell.sh" }
    ]
  }
}
```

Claude Code usa arquivo e nomes de evento diferentes, mas o mesmo script:

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/scripts/hooks/gate-shell.sh" }
        ]
      }
    ]
  }
}
```

Harness Score recompensa qualquer um na dimensão Hooks & Guardrails — eventos
gate (`beforeShellExecution`, `PreToolUse`) satisfazem checks de gate hook,
e o script referenciado deve existir no repositório (scripts commitados fazem
parte do que os checks validam). Um script, duas configs, ambas ferramentas
protegidas.

## Lógica de pontuação

O scanner avalia cada dimensão via semântica OR, depois atribui um **nível de maturidade** ao repositório. Limiares (espelhados de `LEVEL_REQUIREMENTS` do scanner):

- **L0 · Sem harness** → padrão; nenhum requisito atendido.
- **L1 · Documentado** → context ≥ 40% (guia raiz substantiva).
- **L2 · Orientado** → context ≥ 60%, skills ≥ 30% **ou** hooks ≥ 30%, hygiene ≥ 50%.
- **L3 · Com sensores** → sensors ≥ 60% e CI ≥ 50%.
- **L4 · Autocorretivo** → hooks ≥ 70% e pontuação total ≥ 80%.

O nível aplica-se ao repositório inteiro, não por ferramenta. Isso é intencional: seu objetivo é elevar a qualidade geral do trabalho assistido por IA no projeto, independente da ferramenta que o dev escolheu. O modelo completo, com rationale por limiar, está no [modelo de maturidade](./maturity-model).

## Migrações e mudança de ferramenta

Se trocar ferramenta principal (ex.: Cursor → Claude Code), o harness transfere gradualmente e a pontuação nunca despenca:

1. Adicione artefatos nativos Claude (`CLAUDE.md` aninhados, `.claude/skills/`, hooks em `.claude/settings.json`) junto da config `.cursor/` existente.
2. Rode `npx harness-score` → **mesmo nível**, porque guias, testes, CI e higiene são agnósticos, e artefatos de ambas ferramentas satisfazem os mesmos checks.
3. Deprecie config `.cursor/` antiga quando ninguém usar Cursor (opcional — manter não custa nada).
4. Harness Score continua reconhecendo ambos — sem risco de regressão.

## Limitações e roadmap

**Atual (v1.0.0):**

- Suporte a plugins é escalonado: **Cursor** (principal, audit-and-fix completo), **Claude Code** (Fase 0, audit read-only), outros TBD (veja [PLUGINS-ROADMAP.md](https://github.com/paladini/harness-score/blob/main/PLUGINS-ROADMAP.md)).
- A CLI é tool-aware e totalmente multi-harness: relatórios terminal e markdown mostram linha `Detected:` com toda ferramenta reconhecida, e `--json` inclui `detectedHarnesses`. Plugins alcançam com o tempo.
- Hooks reconhecidos só para Cursor e Claude Code — sistemas de hooks de outras ferramentas (conforme surgirem) precisam de entradas no registry.

**Planejado (pós-1.0):**

- Scaffolding interativo `harness-score init` (templates determinísticos por ferramenta).
- Saída SARIF para integração CI/segurança enterprise.
- Melhorias no detector de ecossistema (mais variantes e locais de config).

## FAQs

**P: Preciso configurar todas as ferramentas suportadas?**

R: Não. Se configurar Cursor, Harness Score conta. Se depois adicionar artefatos Claude Code, ambos são reconhecidos — mas uma ferramenta bem configurada basta para pontuar bem.

**P: Se uso só Cursor, ainda posso compartilhar minha pontuação?**

R: Sim. O nível de maturidade é medida de repositório, não de ferramenta. Repo em L3 significa "trabalho assistido por IA bem gateado e verificado aqui" — não especifica *qual* ferramenta. Ao compartilhar o badge, é credível use Cursor, Claude Code ou ambos.

**P: E se minha ferramenta não está listada?**

R: Abra issue com o formato de config da ferramenta e adicionaremos suporte. O caminho mais confiável enquanto isso é (1) usar `AGENTS.md` + sensores agnósticos (testes, linters, tipos, CI), que funcionam em todo lugar, ou (2) mapear artefatos da ferramenta para os que já reconhecemos.

**P: Posso ver quais ferramentas foram detectadas?**

R: Sim — `npx harness-score --json` inclui array `detectedHarnesses`. Fluxo CI típico:

```yaml
- name: Audit harness maturity
  run: npx harness-score --min-level 3

- name: Fail if no tool is configured
  run: npx harness-score --json | jq -e '.detectedHarnesses | length > 0'
```

Isso garante que o gate de maturidade passa *e* que o harness de pelo menos uma ferramenta foi reconhecido (`jq -e` sai non-zero quando a expressão é `false`).
