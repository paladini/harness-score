# Suporte multi-harness

A partir da **v0.4.0**, o Harness Score mede a maturidade do harness de código com IA em **qualquer ferramenta** — não só Cursor. Seja Cursor, Claude Code, Devin Local, Windsurf/Cascade, Cline, Continue, GitHub Copilot, Codex, OpenCode, Antigravity, Zed ou outro IDE/agente de código, o mesmo modelo de 108 pontos se aplica.

## Por que multi-harness importa

O harness é agnóstico de ferramenta. Um `AGENTS.md` bem escrito, um `.gitignore` que protege segredos, um pipeline CI que roda testes — funcionam igual para Cursor, Claude Code, Windsurf ou qualquer outro agente. A infraestrutura de harness que você constrói uma vez beneficia *toda* ferramenta de IA no projeto.

O Harness Score torna isso explícito: você mede uma vez, qualquer ferramenta se beneficia. Você não constrói harness Cursor e harness Claude Code separados — constrói *um harness*, e cada ferramenta compatível herda as partes que entende.

## Como funciona: semântica OR

O scanner usa **semântica OR** para artefatos específicos de ferramenta. Cada check pergunta "alguma ferramenta reconhecida fornece isso?" — não "o Cursor fornece?". Por exemplo:

- `.cursor/rules/*.mdc`, `.cline/rules/*.md`, `.devin/rules/*.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` ou `AGENTS.md` / `CLAUDE.md` aninhados → conta para **rules**
- `.cursor/hooks.json`, `.github/hooks/*.json`, `.codex/hooks.json`, `.claude/settings.json` ou hooks do Devin → conta para **hooks**
- `.cursor/skills/<name>/SKILL.md`, `.cline/skills/<name>/SKILL.md`, `.github/skills/<name>/SKILL.md` ou `.agents/skills/<name>/SKILL.md` compartilhado → conta para **skills**
- `.cursor/agents/*.md`, `.claude/agents/*.md`, `.opencode/agents/*.md` ou `.devin/agents/*.md` → conta para **subagents**
- `AGENTS.md`, `AGENT.md`, `AGENTS.local.md`, `CLAUDE.md` ou `GEMINI.md` na raiz, ou `.claude/CLAUDE.md` / `.claude/AGENTS.md` → conta para **guias de contexto**

Você não precisa configurar todos — um basta. Desde v0.5.0, adicionar segunda ferramenta nunca *abaixa* sua pontuação: quando várias configs de hooks existem, vence a com mais eventos registrados.

## Ferramentas suportadas

O Harness Score reconhece estes artefatos (padrões exatos no registry do scanner —
[`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)):

| Ferramenta | Rules | Skills | Commands / workflows | Subagents | Hooks | MCP |
|---|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/*.mdc` | `.cursor/skills/*/SKILL.md` | `.cursor/commands/*.md` | `.cursor/agents/*.md` | `.cursor/hooks.json` | `.cursor/mcp.json` |
| **Claude Code** | `.claude/rules/**/*.md`, `AGENTS.md` / `CLAUDE.md` aninhados em dirs de código | `.claude/skills/*/SKILL.md` | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json` (`hooks`) | `.mcp.json` |
| **Devin Local** | `.devin/rules/*.md`, `.devin/global_rules.md`, `AGENT*.md` aninhados | `.devin/skills/*/SKILL.md` | `.devin/workflows/*.md` | `.devin/agents/*.md` ou `<name>/AGENT.md` | `.devin/hooks.v1.json`, legado `.devin/config.json` | `.devin/mcp_config.json` |
| **Windsurf / Cascade (legado)** | `.windsurf/rules/*.md`, `.windsurf/global_rules.md`, `.windsurfrules` | — | `.windsurf/workflows/*.md` (Cascade) | — | — | — |
| **Cline** | `.clinerules/*.md`, `.cline/rules/*.md`, `.clinerules` legado | `.cline/skills/*/SKILL.md` | — | — | — | — |
| **Continue** | `.continue/rules/*.md` | — | `.continue/prompts/*` | — | — | `.continue/mcpServers/*.{json,yaml,yml}` |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | `.github/skills/*/SKILL.md` | `.github/prompts/*.prompt.md` | Agentes personalizados em `.github/agents/*.md` são detectados, mas não contam como subagents delegáveis | `.github/hooks/*.json` | `.vscode/mcp.json` |
| **Codex** | `AGENTS.md` aninhados | `.agents/skills/*/SKILL.md` | — | — | `.codex/hooks.json`, `[[hooks.*]]` em `.codex/config.toml` | `[mcp_servers.*]` em `.codex/config.toml` |
| **Gemini / Antigravity** | `.agents/rules/`, `.agent/rules/`, `.gemini/rules/`, `GEMINI.md` aninhados | `.agents/skills/*/SKILL.md` | `.agents/workflows/`, `.agent/workflows/` | — | — | `.agents/mcp_config.json`, `.agent/mcp_config.json` |
| **OpenCode** | instruções compartilhadas `AGENTS.md` | `.opencode/skills/*/SKILL.md` e `*.md` na raiz | `.opencode/commands/**/*.md` | `.opencode/agents/*.md` | — | `opencode.json[c]` |
| **Zed** | `.rules` (legado); `AGENTS.md` compartilhado | `.agents/skills/*/SKILL.md` | `.zed/commands/*.md` (formato existente) | — | — | — |

Os caminhos refletem a documentação oficial atual. Consulte as referências de
[personalização e hooks do Copilot](https://docs.github.com/en/copilot/reference/customization-cheat-sheet),
[comandos e skills do OpenCode](https://opencode.ai/docs/commands),
[regras e skills do Cline](https://docs.cline.bot/customization/cline-rules),
[instruções e skills do Zed](https://zed.dev/docs/ai/instructions) e
[personalizações do Devin Local](https://docs.devin.ai/desktop/devin-local/customizations).
Os hooks TOML do Codex estão na [documentação de hooks](https://learn.chatgpt.com/docs/hooks)
e na [referência de configuração](https://learn.chatgpt.com/docs/config-file/config-advanced).
Skills compartilhadas são detectadas para cada consumidor documentado, mas coletadas
e pontuadas uma só vez. Agentes personalizados do Copilot identificam a ferramenta,
mas não contam como subagents delegáveis.

Quando um arquivo reconhecido corresponde a uma categoria pontuada, o check existente
usa esse arquivo como evidência e pode conceder seus pontos. Isso pode aumentar a nota;
IDs, valores, dimensões e limites dos níveis não mudam. Arquivos globais contribuem
apenas para o score effective quando esse escopo está habilitado.

Os caminhos legados de regras e workflows do Windsurf/Cascade continuam reconhecidos.
Devin Local é o agente atual do Devin Desktop e usa configuração própria; workflows
legados do Cascade não são tratados como workflows do Devin Local.

### Compatibilidade com o ambiente Devbox

O Harness Score é compatível com repositórios que usam o
[Devbox](https://www.jetify.com/docs/devbox) como ambiente de desenvolvimento.
Isso é compatibilidade de filesystem, não detecção de harness de IA: o Devbox não
aparece em `detectedHarnesses`, e sua configuração não gera pontos de maturidade.

O Devbox cria um diretório `.devbox/` local ao projeto para o ambiente isolado.
Esse diretório pode conter estado gerado, como `.devbox/virtenv/`, e o symlink
`.devbox/bin/devbox` usado dentro de um shell puro. O Harness Score ignora todo o
diretório `.devbox/`, incluindo symlinks, para que arquivos do ambiente gerado não
deixem o scan incompleto. Consulte o
[FAQ do Devbox](https://www.jetify.com/docs/devbox/faq) e a
[implementação do Devbox](https://github.com/jetify-com/devbox/blob/main/internal/devbox/pure_shell.go)
para os paths upstream.

Mantenha a configuração do projeto em `devbox.json`, `devbox.lock` e `devbox.d/`
na raiz do projeto. Esses paths continuam visíveis para o scan. Arquivos colocados
em `.devbox/` não são intencionalmente pontuados como artefatos de harness.

Arquivos de contexto na raiz (`AGENTS.md`, `AGENT.md`, `AGENTS.local.md`, `CLAUDE.md`, `GEMINI.md`) contam como guias compartilhados.
E os artefatos mais importantes são **agnósticos de ferramenta**: testes, CI, linters, type checkers, `.gitignore`, lockfiles e `SECURITY.md` pontuam igual independente da ferramenta.

::: tip Coluna esparça de uma ferramenta não é penalidade
Windsurf não tem sistema de hooks de ciclo de vida reconhecido pelo scanner — mas hooks são só uma dimensão de seis. Repositório só Windsurf com rules, sensores e CI fortes ainda sobe a L3. L4 exige gate hooks, que podem vir de configurações do Cursor, Claude Code, Copilot, Codex ou Devin.
:::

## Construindo o harness uma vez

Caminho típico de upgrade para repositório multi-ferramenta:

1. **Comece com uma ferramenta** (ex.: Cursor). Escreva `AGENTS.md`, adicione `.cursor/rules/`, configure sensores (testes, lint, tipos, CI).
2. **A equipe adiciona segunda ferramenta** (ex.: Claude Code). Artefatos compartilhados — `AGENTS.md`, testes, CI, higiene — já funcionam. Adicione peças nativas só onde o comportamento difere: `CLAUDE.md` aninhados para orientação por diretório, `.claude/settings.json` para hooks.
3. **O harness fica num lugar.** Sensores, guardrails e guias são nível repo — toda ferramenta herda automaticamente.
4. **Exija maturidade, não ferramentas.** CI roda `harness-score --min-level 3` e segura todas na mesma barra.

## Harness de projeto vs usuário/global

A pontuação **maturity** conta só arquivos no repositório — o que a equipe
revisa em pull requests. A **effective** opcional inclui instalações em nível
de usuário com `--scope user` ou `scopes.user` em
[`.harness-score.json`](./measure-and-improve#scan-configuration).

| Local | Exemplos | Conta em maturity | Conta em effective (quando ativo) |
|---|---|---|---|
| Repositório | `.cursor/`, `AGENTS.md`, CI, testes | Sim | Sim |
| Home do usuário | `~/.cursor/…`, `~/.claude/…`, `~/.codeium/windsurf/…`, `~/Documents/Cline/Rules`, `~/.cline/…`, `~/.continue/…`, `~/.agents/…`, `~/.zed/…`, `~/.copilot/…`, `$XDG_CONFIG_HOME/devin/…` | Não | Sim |
| Checkout compartilhado | `extraRoots` para harness de equipe | Não | Sim |

Caminhos globais são **allowlisted** por ferramenta — o scanner nunca varre
todo `$HOME`. User Rules do Cursor só na UI do IDE não aparecem em nenhum score.

### Cobertura do user scope por ferramenta {#user-scope-by-tool}

Com `--scope user`, caminhos físicos são mapeados para as mesmas formas
repo-relative do registry, para checks se comportarem como arquivos do repo.

| Ferramenta | Caminhos user-scope (exemplos) | Notas |
|---|---|---|
| **Cursor** | `~/.cursor/{skills,commands,agents,rules}`, `~/.cursor/mcp.json` | User Rules só na UI continuam invisíveis |
| **Claude Code** | `~/.claude/{skills,commands,agents}`, `~/.claude/settings.json`, `~/.mcp.json`, user-scoped plugins from `~/.claude/plugins/installed_plugins.json` | User plugins count toward effective score only |
| **Windsurf / Cascade** | `~/.codeium/windsurf/memories/global_rules.md` → `.windsurf/rules/…`, `~/.windsurf/{rules,workflows}/`, `~/.codeium/windsurf/global_workflows/` | Caminhos legados do Cascade; sem aliases MCP/hooks não documentados |
| **Cline** | `~/Documents/Cline/Rules/*.md`, `~/.cline/rules/`, `~/.cline/skills/` | Fallback das regras: `~/Cline/Rules` |
| **Continue** | `~/.continue/{rules,prompts,mcpServers}/` | Regras inline em `config.yaml` não parseadas (v1) |
| **Codex / Antigravity** | `~/.agents/{skills,rules,workflows}/`, `~/.agent/…`, `~/.gemini/rules/`, `~/.codex/{skills,hooks.json,config.toml}`, `~/.agents/AGENTS.md` | |
| **OpenCode** | `$XDG_CONFIG_HOME/opencode/{agents,commands,skills}/`, `opencode.json[c]` | |
| **Zed** | `~/.agents/skills/`, `~/.config/zed/AGENTS.md` ou `%APPDATA%\Zed\AGENTS.md`, `~/.zed/commands/` | Instruções pessoais mapeadas para o guia de contexto compartilhado |
| **GitHub Copilot** | `~/.copilot/{skills,agents,hooks}/` | Hooks pessoais reconhecidos; instruções globais continuam gerenciadas pela UI/config |
| **Devin Local** | `$XDG_CONFIG_HOME/devin/{rules,skills,agents,workflows,AGENTS.md,hooks.v1.json,mcp_config.json}` | Arquivos mapeados para equivalentes de projeto no effective |

**GitHub Copilot** não tem caminho global documentado em disco — mantenha
instruções de equipe no repositório para paridade maturity/effective.

Tabela completa de escopos: [Métricas e códigos](./metrics-and-codes#scopes).

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
- Hooks reconhecidos para Cursor, Claude Code e Devin — sistemas de hooks de outras ferramentas (conforme surgirem) precisam de entradas no registry. Devin é **somente detecção** no CLI (sem plugin ainda); o scanner lê apenas caminhos `.devin/` no repositório — não `.devin/config.local.json` (gitignored) nem configurações Devin no home do usuário.

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
