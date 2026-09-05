# Referência de métricas e códigos

Folha de consulta densa para tudo que o `harness-score` reporta: pontuações, escopos,
níveis, dimensões, IDs de check, chaves de configuração, flags da CLI, inputs da Action
e campos JSON. Receitas de remediação estão no
[capítulo 8 — Medir e melhorar](./measure-and-improve#the-check-catalog).

## Pontuações: maturity vs effective {#scores-maturity-vs-effective}

| Código | O que inclui | Usado para |
|---|---|---|
| **maturity** | Somente arquivos do repositório (`scopes: repo`) | Gate padrão de CI, badge, `--min-level`, maturidade oficial do time |
| **effective** | Repo ∪ escopos globais/extras configurados | Localmente: “o que o agente vê nesta máquina” quando harness user/system está habilitado |

Quando nenhum escopo extra está configurado, `effective` iguala `maturity` (mesmo nível,
pontuação e checks). O relatório sempre inclui ambos os blocos para JSON estável.

Defina qual pontuação faz gate no CI com `gate` na config, `--gate` ou o input `gate`
da Action (`maturity` por padrão).

## Escopos {#scopes}

| Escopo | Significado | O que é escaneado |
|---|---|---|
| `repo` | Sempre ativo | O diretório passado ao `harness-score` (padrão `.`) |
| `user` | Opt-in | Caminhos allowlisted mapeados para formas repo-relative: `~/.cursor/*`, `~/.claude/*`, `~/.codeium/windsurf/*` (alias Windsurf), `~/Documents/Cline/Rules` → `.clinerules/`, `~/.continue/{rules,prompts}`, `~/.agents/*`, `~/.zed/commands`, `~/.config/opencode/agents`, etc. Ver [multi-harness — user scope por ferramenta](./multi-harness#user-scope-by-tool). **Não inclui:** Copilot global (só repo), regras inline do Continue em `config.yaml`, User Rules do Cursor só na UI. |
| `system` | Opt-in | Reservado para instalações validadas em nível de sistema (mínimo na v1) |
| `extraRoots` | Opt-in | Diretórios adicionais (relativos ou absolutos) cuja árvore espelha o layout do harness — ex.: checkout compartilhado de harness do time |

Arquivos do projeto **vencem** caminhos de overlay em conflito (mesmo caminho relativo).

**Não escaneado:** Cursor User Rules armazenadas só na UI do IDE (não em disco),
varreduras arbitrárias do home directory, ou conteúdo de segredos em strings de evidência.

## Níveis (L0–L4)

Nomes oficiais de nível aplicam-se à **maturity**, salvo se você definir `gate: effective`.

| Nível | Nome | Requisitos (todos os níveis anteriores +) |
|---|---|---|
| L0 | Unharnessed | — |
| L1 | Documented | context ≥ 40% |
| L2 | Guided | context ≥ 60%; skills ≥ 30% **ou** hooks ≥ 30%; hygiene ≥ 50% |
| L3 | Sensing | sensors ≥ 60%; ci ≥ 50% |
| L4 | Self-correcting | hooks ≥ 70%; total ≥ 80% |

Narrativa completa: [O modelo de maturidade](./maturity-model).

## Dimensões

| ID | Título | Pts máx | Mede |
|---|---|---|---|
| `context` | Context & Guides | 20 | AGENTS.md, rules com escopo, README |
| `skills` | Skills & Commands | 17 | Skills, commands/workflows, subagents |
| `hooks` | Hooks & Guardrails | 14 | hooks.json / hooks em settings do Claude |
| `sensors` | Sensors & Feedback | 20 | Testes, linter, tipos, formatter |
| `ci` | CI Feedback | 14 | Pipeline, pre-commit |
| `hygiene` | Hygiene & Safety | 23 | .gitignore, segredos, lockfile, licença, higiene MCP |

**Total:** 108 pontos.

## Catálogo de checks

IDs estáveis — vinculados à remediação em [Medir e melhorar](./measure-and-improve#the-check-catalog).

### Context & Guides

| ID | Pts | Analisa exatamente | Remediação |
|---|---|---|---|
| CTX-01 | 4 | `AGENTS.md`, `CLAUDE.md` ou `GEMINI.md` na raiz existe | [ctx-01](./measure-and-improve#ctx-01) |
| CTX-02 | 3 | Arquivo de contexto tem ≥20 linhas significativas e ≥2 headings | [ctx-02](./measure-and-improve#ctx-02) |
| CTX-03 | 4 | Pelo menos um arquivo de rule com escopo (qualquer ferramenta suportada) ou arquivo de contexto aninhado | [ctx-03](./measure-and-improve#ctx-03) |
| CTX-04 | 3 | Toda rule declara metadados de ativação no frontmatter | [ctx-04](./measure-and-improve#ctx-04) |
| CTX-05 | 2 | Nem toda rule é always-on genérica | [ctx-05](./measure-and-improve#ctx-05) |
| CTX-06 | 2 | Nenhum arquivo de rule único excede 500 linhas | [ctx-06](./measure-and-improve#ctx-06) |
| CTX-07 | 1 | `README.md` na raiz do repositório | [ctx-07](./measure-and-improve#ctx-07) |
| CTX-08 | 1 | Sem `.cursorrules` legado sem rules modernas com escopo | [ctx-08](./measure-and-improve#ctx-08) |

### Skills & Commands

| ID | Pts | Analisa exatamente | Remediação |
|---|---|---|---|
| SKL-01 | 4 | Pelo menos um `SKILL.md` em diretório de skills reconhecido | [skl-01](./measure-and-improve#skl-01) |
| SKL-02 | 3 | Toda skill tem `name:` e `description:` no frontmatter | [skl-02](./measure-and-improve#skl-02) |
| SKL-03 | 3 | Arquivos command/workflow existem para qualquer ferramenta suportada | [skl-03](./measure-and-improve#skl-03) |
| SKL-04 | 2 | Descrições de skill têm ≥40 caracteres | [skl-04](./measure-and-improve#skl-04) |
| AGT-01 | 3 | Pelo menos um arquivo markdown de subagent | [agt-01](./measure-and-improve#agt-01) |
| AGT-02 | 2 | Todo subagent tem frontmatter `name:` e `description:` | [agt-02](./measure-and-improve#agt-02) |

### Hooks & Guardrails

| ID | Pts | Analisa exatamente | Remediação |
|---|---|---|---|
| HKS-01 | 4 | Config de hooks existe e parseia como JSON | [hks-01](./measure-and-improve#hks-01) |
| HKS-02 | 2 | Eventos e handlers tipados são estruturalmente válidos; evento válido desconhecido gera warning | [hks-02](./measure-and-improve#hks-02) |
| HKS-03 | 4 | Hook classe gate registrado (shell/MCP/read/tool gate) | [hks-03](./measure-and-improve#hks-03) |
| HKS-04 | 2 | Hook classe feedback registrado (post-edit/tool) | [hks-04](./measure-and-improve#hks-04) |
| HKS-05 | 2 | Todo caminho local em executáveis e args existe; handlers sem comando não se aplicam | [hks-05](./measure-and-improve#hks-05) |

### Sensors & Feedback

| ID | Pts | Analisa exatamente | Remediação |
|---|---|---|---|
| SNS-01 | 6 | Test runner configurado (script em `package.json`, pytest, go test, etc.) | [sns-01](./measure-and-improve#sns-01) |
| SNS-02 | 5 | Linter configurado (eslint, biome, ruff, golangci-lint, …) | [sns-02](./measure-and-improve#sns-02) |
| SNS-03 | 4 | Type checking configurado (tsconfig, mypy, pyright, …) | [sns-03](./measure-and-improve#sns-03) |
| SNS-04 | 3 | Formatter configurado (prettier, black, gofmt, …) | [sns-04](./measure-and-improve#sns-04) |
| SNS-05 | 2 | Pelo menos um arquivo de teste existe na árvore | [sns-05](./measure-and-improve#sns-05) |

### CI Feedback

| ID | Pts | Analisa exatamente | Remediação |
|---|---|---|---|
| CI-01 | 4 | Arquivo de pipeline CI presente (GitHub Actions, GitLab CI, …) | [ci-01](./measure-and-improve#ci-01) |
| CI-02 | 4 | CI executa a suíte de testes | [ci-02](./measure-and-improve#ci-02) |
| CI-03 | 3 | CI executa lint ou typecheck | [ci-03](./measure-and-improve#ci-03) |
| CI-04 | 3 | Ferramenta pre-commit ou git hook instalada | [ci-04](./measure-and-improve#ci-04) |

### Hygiene & Safety

| ID | Pts | Analisa exatamente | Remediação |
|---|---|---|---|
| HYG-01 | 2 | `.gitignore` presente | [hyg-01](./measure-and-improve#hyg-01) |
| HYG-02 | 3 | `.gitignore` cobre arquivos de ambiente | [hyg-02](./measure-and-improve#hyg-02) |
| HYG-03 | 4 | Sem arquivos `.env` desprotegidos (sem padrão `.env.example`) | [hyg-03](./measure-and-improve#hyg-03) |
| HYG-04 | 4 | Configs JSON de MCP sem padrões inline de credencial | [hyg-04](./measure-and-improve#hyg-04) |
| HYG-05 | 2 | Arquivo `LICENSE` presente | [hyg-05](./measure-and-improve#hyg-05) |
| HYG-06 | 2 | Sem assinaturas tipo credencial em markdown/JSON de harness | [hyg-06](./measure-and-improve#hyg-06) |
| HYG-07 | 3 | Lockfile de dependências commitado | [hyg-07](./measure-and-improve#hyg-07) |
| HYG-08 | 3 | Configs MCP usam interpolação de env para segredos | [hyg-08](./measure-and-improve#hyg-08) |

## Arquivo de configuração (`.harness-score.json`) {#configuration-file-harness-scorejson}

JSON opcional na raiz do scan (schema estrito — chaves desconhecidas geram erro):

```json
{
  "scopes": {
    "user": false,
    "system": false
  },
  "extraRoots": [
    { "id": "team-shared", "path": "../shared-harness" }
  ],
  "gate": "maturity",
  "extends": ["no-hooks"],
  "rules": {
    "HYG-05": "off"
  }
}
```

| Chave | Tipo | Padrão | Significado |
|---|---|---|---|
| `scopes.user` | boolean | `false` | Incluir overlay de harness em nível de usuário |
| `scopes.system` | boolean | `false` | Incluir overlay em nível de sistema |
| `extraRoots` | `{ id, path }[]` | `[]` | Árvores extras de harness mescladas no effective |
| `gate` | `"maturity"` \| `"effective"` | `"maturity"` | Qual pontuação o `--min-level` usa |
| `extends` | `string[]` | `[]` | Presets nomeados a aplicar (veja abaixo) |
| `rules` | `Record<checkId, severity>` | `{}` | Override de severidade por check, aplicado depois de cada preset em `extends` |

Precedência: **flags da CLI → inputs da Action → arquivo de config → padrões**. `extends`/`rules` são exclusivos do arquivo de config nesta versão — ainda não existe flag `--extends`/`--rule` na CLI nem input equivalente na Action; use `--config <path>` apontando para um `.harness-score.json` que os defina.

### Personalização por equipe: `extends` e `rules` {#team-customization}

O vocabulário é emprestado diretamente do ESLint, porque é um vocabulário que a maioria das equipes já conhece:

- **`rules`** sobrescreve a severidade de um check específico por ID: `"HYG-05": "off"`. A severidade é `"off"` ou `"error"` nesta versão — `"error"` é o padrão implícito de todo check, e `"off"` remove o check **do numerador e do denominador** da pontuação da sua dimensão (é excluído estruturalmente, nunca contado como falha). `"warn"` é um valor reconhecido mas deliberadamente rejeitado hoje com um erro claro de "ainda não suportado" — reservado para um modo futuro, consultivo e não-bloqueante.
- **`extends`** aplica um preset nomeado e curado pelos mantenedores — um pacote versionado e revisado via PR de overrides de `rules`, não uma isenção livre por repositório. Isso preserva a mesma governança que já protege o catálogo de checks: propor um preset novo passa por revisão (veja [CONTRIBUTING.md](https://github.com/paladini/harness-score/blob/main/CONTRIBUTING.md#proposing-a-preset)), não é um opt-out local silencioso. Presets em `extends` são aplicados na ordem do array, e qualquer entrada explícita em `rules` sempre prevalece sobre um preset.

Todo check excluído por `extends`/`rules` é sempre divulgado — na saída do terminal (linha `Preset: ...`), no relatório Markdown (linha `**Preset:**` e status `➖` na tabela de checks) e no campo `preset` do `--json` — nunca escondido silenciosamente atrás de uma flag.

Uma exceção, proposital: `HYG-03`, `HYG-04` e `HYG-06` — os checks que detectam credenciais efetivamente vazadas ou expostas — nunca podem ser definidos como `"off"`, nem via `rules` nem via preset. Todo o resto nesse formato de config se apoia em divulgação e revisão de PR pra manter a integridade; esses três são o único ponto que não é negociável.

#### Presets nativos

| Preset | Efeito | Por quê |
|---|---|---|
| `no-hooks` {#preset-no-hooks} | Define `HKS-01`–`HKS-05` (toda a dimensão Hooks & Guardrails, 14 dos 108 pontos) como `"off"` | Para ambientes onde a execução de scripts de hook local é vedada por política — dev containers travados, orgs reguladas, runners compartilhados sem permissão de instalar hooks. O guardrail nesses casos é aplicado só via CI. |

Excluir uma dimensão inteira tem uma consequência honesta que vale saber de antemão: como **L4 · Self-correcting** é *definido* por hooks de guardrail em runtime (veja o [Modelo de Maturidade](./maturity-model)), um repositório sob `no-hooks` nunca alcança L4 — o nível fica **capped** (limitado), não "reprovado". `report.level.capped` é `true` e `report.level.capReason` explica o motivo; toda outra dimensão continua com a pontuação intacta. Isso é o scanner sendo honesto sobre o que "self-correcting" significa, não uma penalidade por excluir hooks.

## Flags da CLI (configuração do scan)

A descoberta de maturity no repositório não possui limite de profundidade em
produção. Ela inclui arquivos rastreados, não rastreados e ignorados depois de
pular diretórios conhecidos de dependências e artefatos gerados.
`file-count-limit` representa um fusível emergencial de 1.000.000 de arquivos
para o repositório; overlays limitados de user e extra roots ainda podem
reportar `depth-limit`. Um caminho descoberto que não possa ser inspecionado
quando solicitado por um check reporta `unreadable-path`; conteúdos acima de
512 KiB, ignorados intencionalmente, não reportam esse motivo. Symlinks internos
são seguidos e deduplicados, enquanto um alvo fora da raiz reporta
`outside-root-symlink` e não é percorrido nem lido.

| Flag | Significado |
|---|---|
| `--config <file>` | Carregar config de caminho específico |
| `--scope user` | Habilitar escopo user (separados por vírgula: `user`, `system`) |
| `--gate maturity\|effective` | Pontuação usada para `--min-level` |
| `--min-level <0-4>` | Exit 1 quando a pontuação gated completa está abaixo do nível; snapshot selecionado pelo gate incompleto retorna exit 2 |
| `--json` | Relatório completo incluindo `scopes`, `gate`, `effective` e `verdicts` |

## Inputs da GitHub Action

| Input | Padrão | Significado |
|---|---|---|
| `include-user-harness` | `false` | Passa `--scope user` |
| `include-system-harness` | `false` | Passa `--scope system` |
| `gate` | `maturity` | Passa `--gate` |
| `config` | `''` | Passa `--config` quando definido |
| `min-level` | `0` | Falha quando pontuação gated está abaixo do nível |

Outputs: `level`, `level-name`, `percent` (maturity); `effective-level`, `effective-percent`.
A Action publica outputs, badge e relatório de maturity somente quando maturity está completo, e outputs de effective somente quando effective está completo. Se apenas effective estiver incompleto, `gate: maturity` pode passar com um aviso; `gate: effective` retorna exit 2. Maturity incompleto não publica outputs de maturity, badge, relatório ou comentário na PR.

## Campos JSON do relatório (estáveis)

| Campo | Descrição |
|---|---|
| `root` | Raiz absoluta do scan |
| `scopes.maturity` | Sempre `["repo"]` |
| `scopes.effective` | ex.: `["repo"]`, `["repo","user"]` |
| `gate` | `"maturity"` ou `"effective"` |
| `resolvedRoots` | Lista opcional de `{ scope, absPath }` para overlays |
| `level`, `score`, `dimensions`, `checks` | Snapshot de **maturity** |
| `effective` | Mesma forma: `{ level, score, dimensions, checks, detectedHarnesses }` |
| `detectedHarnesses` | Ferramentas vistas no **repo** (informativo) |
| `verdicts.maturity`, `verdicts.effective` | Status de completude e motivos determinísticos de cada snapshot: `complete` ou `incomplete` |
| `verdicts.*.reasons[]` | `file-count-limit`, `depth-limit`, `unreadable-directory`, `unreadable-path` ou `outside-root-symlink`, com `path` e `limit` opcionais |
| `truncated` | Alias de compatibilidade; `true` quando o snapshot de maturity ou effective está incompleto por qualquer motivo |
| `preset` | `{ extends, rules, resolved }` — personalização de equipe efetivamente aplicada; `resolved` só lista checks cuja severidade difere do padrão |
| `level.capped`, `level.capReason` | `capped` é `true` quando um requisito bloqueante do próximo nível nunca pode ser satisfeito sob a config atual (ex.: dimensão excluída por preset); `capReason` explica o motivo |
| `dimensions[].applicable` | `false` só quando todo check daquela dimensão resolveu para `"off"` |
| `checks[].severity` | `"off"` \| `"warn"` \| `"error"` — a severidade resolvida usada por este scan para aquele check |
| `checks[].warnings` | Diagnósticos opcionais e não fatais `{ code, message, source? }`; terminal e Markdown os exibem sem alterar pontos |

`level`, `score`, dimensões e checks continuam presentes para diagnóstico, mas são provisórios quando o veredito correspondente é `incomplete`. Terminal e Markdown identificam o snapshot indisponível. O badge sempre representa maturity e usa `incomplete`, nunca L0-L4, quando maturity está incompleto. Relatórios antigos sem `verdicts` são completos quando `truncated` é `false` e incompletos quando é `true`.

`--diff` compara campos de **maturity** por padrão (top-level `level` / `score` / `checks`) e rejeita baseline ou resultado atual com maturity incompleto. Effective incompleto não bloqueia um diff de maturity.
