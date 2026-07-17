# Medir e melhorar

Tudo neste guia condensa em um comando:

```bash
npx harness-score
```

O scanner percorre seu repositório (somente filesystem — sem LLM, sem rede, sem
telemetria), roda 36 checks determinísticos em qualquer ferramenta de IA e reporta
um nível de maturidade com os gaps exatos para o próximo:

```
  harness-score v1.0.0  /work/my-app

  Maturity: L2 · Guided   Score: 66/108 (61%)
  Detected: Cursor, Claude Code

  Context & Guides     ████████████████░░░░  80%
  Skills & Commands    █████████████░░░░░░░  67%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  ...

  To reach L3: sensors ≥ 60%; ci ≥ 50%
```

> **Multi-ferramenta:** O scanner reconhece artefatos de harness do Cursor, Claude Code,
> Windsurf, Cline, Continue e outras ferramentas via semântica OR — se você configurar
> qualquer uma, o Harness Score conta. Saiba mais em [Suporte multi-harness](./multi-harness).

## Instalação

```bash
npx harness-score                                       # no install
npm install -g harness-score                            # global binary
npm install --save-dev harness-score                    # pinned devDependency
```

Também espelhado em [GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
(`@paladini/harness-score`) e [JSR](https://jsr.io/@paladini/harness-score)
para projetos Deno/Bun.

## Usando como biblioteca

A CLI é um wrapper fino sobre API programática totalmente tipada — útil
para dashboard customizado, bot ou ferramenta que quer o `Report` bruto
em vez de parsear saída de terminal:

```ts
import { score } from 'harness-score';

const report = score('/path/to/repo');
console.log(report.level.name, report.score.percent, report.dimensions);
```

`Report`, `Check`, `CheckResult`, `DimensionScore`, `LevelInfo` e toda
forma shipam como declarações TypeScript — resolvidas via campo `"types"`
explícito, para editores e `tsc` pegarem sem config extra. Blocos de nível
inferior também são exportados, para o que `score()` não cobre diretamente:

```ts
import { createScanContext, buildReport, computeDiff, renderMarkdown } from 'harness-score';

const ctx = createScanContext('/path/to/repo');   // walk the filesystem once
const report = buildReport(ctx);                  // run all 36 checks against it
const markdown = renderMarkdown(report);          // same renderer the CLI's --md uses
```

## Referência da CLI

```bash
harness-score [path]              # human report (default: current directory)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report (use "-" for stdout)
harness-score --badge badge.svg   # SVG pill: harness + detected level (L0–L4)
harness-score --min-level 3       # exit 1 if below L3 — the CI gate
harness-score --diff base.json    # compare against a previous --json report
```

### Acompanhar pontuação no tempo {#diff-mode}

`--diff <file>` compara o scan atual contra relatório baseline salvo de
execução `--json` anterior — deltas de nível e pontuação, movimento por
dimensão e exatamente quais checks viraram:

```bash
harness-score --json > baseline.json   # save today's report
# ...later, after changes...
harness-score --diff baseline.json     # see what moved
```

```
  Compared to baseline:
    Level: L2 · Guided → L3 · Sensing (+1)
    Score: 61/108 (56%) → 84/108 (78%) (+22pp)
    Sensors & Feedback   20% → 90% (+70pp)
    Newly passing: SNS-01, SNS-02, SNS-04, CI-01, CI-02
```

`--diff` funciona com `--json` (adiciona `current`/`baseline`/`diff` ao
payload) e `--md` (adiciona seção "Compared to baseline") — é o que a
GitHub Action usa para comentar "pontuação subiu de L2 para L3" em PRs.

## O plugin Cursor

Instale **Harness Score** do [diretório de plugin neste repo](https://github.com/paladini/harness-score/tree/main/plugins/cursor)
(listagem Cursor Marketplace enviada e pendente de revisão — este link
moverá para lá quando estiver live) e você ganha:

- **`/harness-audit`** — roda o scanner no workspace aberto e faz o agente
  apresentar o relatório com as principais remediações.
- **A skill `harness-engineering`** — quando você diz "corrija" ou
  "melhore meu harness", o agente sabe escrever os artefatos faltantes
  seguindo as receitas deste guia.

A análise em si é sempre a CLI determinística; o modelo só apresenta
resultados e aplica correções que você pedir.

## O gate de CI {#ci-gate}

Harnesses regredem silenciosamente — alguém apaga `hooks.json` numa limpeza,
rule apodrece. Trave seu nível no CI:

```yaml
- name: Harness gate
  run: npx -y harness-score --min-level 3
```

Ou use a action empacotada, que também emite o badge:

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
    badge: 'harness-badge.svg'
```

## Mostre sua maturidade {#show-your-maturity}

Harness Score entrega **dois formatos SVG com marca** na mesma linguagem visual
das barras de progresso do scanner — sem shields.io, sem serviço pago, sem rede
no render:

| Formato | Arquivos | Mostra | Melhor para |
|---|---|---|---|
| **Badge** | `harness-badge.svg` ou `badge-l0.svg` … `badge-l4.svg` | `harness` · `L4` | Fileira README (pílula 112×20) |
| **Share card** | `card-l0.svg` … `card-l4.svg` | Banner completo com nome do nível | Posts sociais, hero do repo (860×240) |

O badge mostra **só o nível** (`L0`–`L4`). Nomes de nível
(Unharnessed, Guided, …) ficam nos share cards e na saída do scanner.

A pílula parece idêntica se CI regenera ou você fixa arquivo estático —
só a fiação muda.

### Badge — auto-atualizando (recomendado)

`harness-score --badge` escreve SVG para o nível que o scanner detecta.
Configure no CI uma vez; a imagem no README atualiza conforme o harness melhora.

```yaml
# .github/workflows/harness.yml
name: Harness Score
on: { push: { branches: [main] } }
permissions: { contents: write }
jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score/action@main
        with: { badge: 'harness-badge.svg' }
      - uses: JamesIves/github-pages-deploy-action@v4
        with: { branch: badges, folder: ., clean: false }
```

Referencie o arquivo publicado no README — receitas copy-paste completas em
[Snippets de embed](#embed-snippets):

```md
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

Defina `height="20"` no `<img>` para a pílula alinhar com shields npm/CI na
mesma fileira (SVG 112×20; só nível — percentual fica no relatório da CLI).

Exemplo dogfood (badge live deste guia no GitHub Pages):

<div class="hs-visual">
  <p class="hs-visual-label">Badge (this repo)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" src="/harness-badge.svg" alt="Harness Score" height="20">
  </div>
</div>

O share card correspondente ao nível detectado é publicado como
`harness-card.svg` (atualmente L4 neste repositório):

<img class="hs-share-card" src="/harness-card.svg" alt="Harness Score L4 · Self-correcting">

### Badge — fixar um nível

Mesma pílula, arquivo estático — escolha `badge-l0.svg` … `badge-l4.svg` se não
quiser que CI regenere a imagem. Veja [Snippets de embed](#embed-snippets) para
Markdown, HTML, iframe, JSX e mais.

### Share card

Para hero image ou post social, use o banner card — inclui o nome do nível
(`Unharnessed`, `Guided`, …):

| Level | Badge | Share card |
|---|---|---|
| L0 · Unharnessed | [badge-l0.svg](https://paladini.github.io/harness-score/maturity/badge-l0.svg) | [card-l0.svg](https://paladini.github.io/harness-score/maturity/card-l0.svg) |
| L1 · Documented | [badge-l1.svg](https://paladini.github.io/harness-score/maturity/badge-l1.svg) | [card-l1.svg](https://paladini.github.io/harness-score/maturity/card-l1.svg) |
| L2 · Guided | [badge-l2.svg](https://paladini.github.io/harness-score/maturity/badge-l2.svg) | [card-l2.svg](https://paladini.github.io/harness-score/maturity/card-l2.svg) |
| L3 · Sensing | [badge-l3.svg](https://paladini.github.io/harness-score/maturity/badge-l3.svg) | [card-l3.svg](https://paladini.github.io/harness-score/maturity/card-l3.svg) |
| L4 · Self-correcting | [badge-l4.svg](https://paladini.github.io/harness-score/maturity/badge-l4.svg) | [card-l4.svg](https://paladini.github.io/harness-score/maturity/card-l4.svg) |

<div class="hs-visual">
  <p class="hs-visual-label">All badge levels (112×20)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" alt="L0" src="/maturity/badge-l0.svg" height="20">
    <img class="hs-badge" alt="L1" src="/maturity/badge-l1.svg" height="20">
    <img class="hs-badge" alt="L2" src="/maturity/badge-l2.svg" height="20">
    <img class="hs-badge" alt="L3" src="/maturity/badge-l3.svg" height="20">
    <img class="hs-badge" alt="L4" src="/maturity/badge-l4.svg" height="20">
  </div>
</div>

<div class="hs-visual">
  <p class="hs-visual-label">Share card example (860×240)</p>
  <img class="hs-share-card" alt="L4 · Self-correcting" src="/maturity/card-l4.svg">
  <p class="hs-visual-detail">Baixe qualquer nível da tabela acima — cards incluem o nome do nível.</p>
</div>

## Snippets de embed {#embed-snippets}

Receitas copy-paste para compartilhar. Substitua placeholders:

| Placeholder | Badge auto-atualizando | Badge fixo (nível `{N}`) | Share card |
|---|---|---|---|
| `{BADGE_URL}` | `https://raw.githubusercontent.com/{owner}/{repo}/badges/harness-badge.svg` | `https://paladini.github.io/harness-score/maturity/badge-l{N}.svg` | — |
| `{CARD_URL}` | — | — | `https://paladini.github.io/harness-score/maturity/card-l{N}.svg` |
| `{LINK}` | Seu repo ou `https://paladini.github.io/harness-score/` | Igual | Igual |

`{N}` é `0`–`4`. Badge live deste repositório (sem CI no seu fork):
`https://raw.githubusercontent.com/paladini/harness-score/main/docs/public/harness-badge.svg`

**Tamanho do badge:** 112×20 — sempre defina `height="20"` (ou `height={20}`) para
a pílula alinhar com badges shields.io na mesma fileira.

### Badge — Markdown

Image only (GitHub, GitLab, dev.to — use HTML if plain `![]()` stretches):

```md
<img alt="Harness Score L4" src="{BADGE_URL}" height="20">
```

Linked (clickable):

```md
[![Harness Score L4]({BADGE_URL})]({LINK})
```

Reference-style:

```md
[![Harness Score][hs-badge]][hs-link]

[hs-badge]: {BADGE_URL}
[hs-link]: {LINK}
```

### Badge — HTML

```html
<img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
```

Linked:

```html
<a href="{LINK}">
  <img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
</a>
```

### Badge — iframe

For CMS or wikis that only allow iframes (not `<img>`):

```html
<iframe
  src="{BADGE_URL}"
  title="Harness Score L4"
  width="112"
  height="20"
  style="border:0;overflow:hidden"
></iframe>
```

### Badge — SVG object / embed

```html
<object data="{BADGE_URL}" type="image/svg+xml" width="112" height="20">
  <a href="{BADGE_URL}">Harness Score L4</a>
</object>
```

```html
<embed src="{BADGE_URL}" type="image/svg+xml" width="112" height="20" />
```

### Badge — JSX / React

```jsx
<a href="{LINK}">
  <img
    alt="Harness Score L4"
    src="{BADGE_URL}"
    height={20}
    width={112}
    style={{ verticalAlign: 'middle' }}
  />
</a>
```

### Badge — AsciiDoc

```asciidoc
image:{BADGE_URL}[Harness Score L4,link={LINK},height=20]
```

### Badge — BBCode (forums)

```text
[url={LINK}][img]{BADGE_URL}[/img][/url]
```

### Badge — direct URL

Cole em chat, bloco de imagem Notion, Slack, Discord ou ferramenta que aceite
URL de imagem crua:

```text
{BADGE_URL}
```

### Share card — Markdown / HTML

Banner para hero do README, posts de blog ou previews sociais (`{N}` = `0`–`4`):

```md
[![Harness Score L4 · Self-correcting]({CARD_URL})]({LINK})
```

```html
<a href="{LINK}">
  <img
    alt="Harness Score L4 · Self-correcting"
    src="{CARD_URL}"
    width="560"
    style="max-width:100%;height:auto;border-radius:8px"
  />
</a>
```

### Share card — iframe

```html
<iframe
  src="{CARD_URL}"
  title="Harness Score L4 · Self-correcting"
  width="560"
  height="157"
  style="border:0;max-width:100%"
></iframe>
```

### Share card — direct URL

```text
{CARD_URL}
```

### Exemplo prático (badge L3 fixo)

```md
<a href="https://paladini.github.io/harness-score/">
  <img alt="Harness Score L3" src="https://paladini.github.io/harness-score/maturity/badge-l3.svg" height="20">
</a>
```

```html
<iframe
  src="https://paladini.github.io/harness-score/maturity/badge-l3.svg"
  title="Harness Score L3"
  width="112"
  height="20"
  style="border:0"
></iframe>
```

> **Fã de shields.io?** Sua Action também pode escrever JSON pequeno e apontar um
> [endpoint shields](https://shields.io/badges/endpoint-badge) para ele
> (`{ "schemaVersion": 1, "label": "harness", "message": "L3", "color": "brightgreen" }`).
> Os SVGs com marca acima são autocontidos e não precisam de terceiros.

## Catálogo de checks {#the-check-catalog}

Cada check que o scanner roda, com receita de remediação. IDs de check são
estáveis; a CLI liga cada falha à entrada aqui.

### Context & Guides (20 pt)

#### CTX-01 · Agent context file present — 4 pts {#ctx-01}
An `AGENTS.md` (or `CLAUDE.md` / `GEMINI.md`) exists at the repository root.
**Correção:** create `AGENTS.md` answering: what is this project, how do I build
and test it, what conventions hold, what must I never touch. Recipe in
[capítulo 3](./guides-feedforward#writing-an-agents-md-that-works).

#### CTX-02 · Context file is substantive — 3 pts {#ctx-02}
≥20 meaningful lines and ≥2 headings — a stub scores nothing.
**Correção:** cover layout, build & test commands, conventions, and no-go zones.
Commands over descriptions; point to rules instead of pasting them.

#### CTX-03 · Scoped rules in use — 4 pts {#ctx-03}
At least one scoped rule file for any supported tool (e.g. `.cursor/rules/*.mdc`,
`.windsurf/rules/*.md`, `.clinerules/*.md`, `.continue/rules/*.md`,
`.github/instructions/*.instructions.md`, `.agents/rules/*`). Nested context
files in subdirectories (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` anywhere below
the root) also count — they are directory-scoped rules in tools like Claude
Code and Codex.
**Correção:** start with one short always-on rule holding your non-negotiables,
then add path-scoped rules per area (or nested context files per subtree).

#### CTX-04 · Rules have valid frontmatter — 3 pts {#ctx-04}
Every rule declares activation metadata (`description`, `globs`/`trigger`/`paths`/`applyTo`, or `alwaysApply`).
Rules a tool auto-loads without metadata — `.continue/rules/*` and nested
context files — pass by construction.
**Correção:** add the frontmatter block; without it the agent can't decide when the
rule applies.

#### CTX-05 · Rules are scoped — 2 pts {#ctx-05}
Not every rule is blanket always-on. Nested context files count as scoped —
they apply only to their subtree.
**Correção:** scope rules to paths (`globs:`, `trigger:` glob, `paths:`, `applyTo:`)
so they load only when relevant — every always-on rule taxes every request's context.

#### CTX-06 · No bloated rules — 2 pts {#ctx-06}
No single rule exceeds 500 lines.
**Correção:** split by concern, or move procedural content into a skill.

#### CTX-07 · README present — 1 pt {#ctx-07}
**Correção:** add a README.md; it's the first orientation document for humans and
a fallback for agents.

#### CTX-08 · No legacy .cursorrules — 1 pt {#ctx-08}
The deprecated single-file format is absent (or modern scoped rules also exist).
**Correção:** migrate `.cursorrules` content into scoped rules for your tool.

### Skills & Commands (17 pts)

#### SKL-01 · At least one skill — 4 pts {#skl-01}
A `SKILL.md` under `.cursor/skills/<name>/`, `.claude/skills/<name>/`, or `.agents/skills/<name>/`.
**Correção:** package your most repeated procedure (deploy, release, migration)
as a skill — [capítulo 3](./guides-feedforward#skills-the-procedural-layer).

#### SKL-02 · Skills declare name and description — 3 pts {#skl-02}
Frontmatter with `name:` and `description:` on every skill.
**Correção:** the agent decides whether to load a skill from these two fields
alone; without them the skill is invisible.

#### SKL-03 · Explicit workflows/commands defined — 3 pts {#skl-03}
Command or workflow files (`.cursor/commands/`, `.windsurf/workflows/`,
`.claude/commands/`, `.continue/prompts/`, `.zed/commands/`, `.agents/workflows/`).
**Correção:** encode workflows you trigger deliberately (`/review`, `/release`)
as command/workflow files.

#### SKL-04 · Skill descriptions are trigger-worthy — 2 pts {#skl-04}
Descriptions ≥40 characters.
**Correção:** write descriptions as trigger conditions — "Use when the user asks
to deploy or release; covers tagging, pipeline, rollback, smoke tests."

#### AGT-01 · Custom subagent defined — 3 pts {#agt-01}
A subagent file under `.cursor/agents/`, `.claude/agents/`, or `.opencode/agents/`.
**Correção:** package a purpose-built subagent for a job the primary agent should
delegate (planning, review, release) — see
[Subagents](./cursor-harness-surface#subagents-purpose-built-delegates)
no capítulo 2.

#### AGT-02 · Subagents declare name and description — 2 pts {#agt-02}
Frontmatter with `name:` and `description:` on every subagent definition.
**Correção:** the parent agent decides whether to delegate from these two fields
alone; without them the subagent is never invoked.

### Hooks & Guardrails (14 pts)

#### HKS-01 · Hooks configuration present and valid — 4 pts {#hks-01}
`.cursor/hooks.json` or `.claude/settings.json` (`hooks` key) exists and parses as JSON.
**Correção:** create hooks config and grow from the
receitas no [capítulo 5](./guardrails-and-safety#gate-hooks).

#### HKS-02 · Known events, version declared — 2 pts {#hks-02}
Version/metadata present; every registered event is documented for your tool
(Cursor lifecycle events, or Claude Code `PreToolUse`/`PostToolUse`).
**Correção:** typo'd event names fail silently — check against the event list in
[capítulo 2](./cursor-harness-surface#hooks-observe-and-control-the-agent-loop).

#### HKS-03 · Gate hook guards risky operations — 4 pts {#hks-03}
A gate hook registered (Cursor: `beforeShellExecution`, `beforeMCPExecution`,
`preToolUse`, or `beforeReadFile`; Claude Code: `PreToolUse`).
**Correção:** gate de deny de comandos destrutivos do capítulo 5 — rules em prosa são
pedidos; gates são fatos.

#### HKS-04 · Feedback hook observes output — 2 pts {#hks-04}
A feedback hook registered (Cursor: `afterFileEdit`, `postToolUse`, …;
Claude Code: `PostToolUse`).
**Correção:** format-and-lint on edit gives the agent instant feedback inside the
session.

#### HKS-05 · Hook scripts committed — 2 pts {#hks-05}
Scripts referenced by the hooks config exist in the repository.
**Correção:** commit them; a hook pointing at a missing script fails open on
every machine but the author's.

### Sensors & Feedback (20 pts)

#### SNS-01 · Test runner configured — 6 pts {#sns-01}
A real test script/config (vitest, jest, pytest, go test, cargo test…).
**Correção:** wire up the runner with one obvious entry point and document it in
AGENTS.md — tests are how the agent verifies its own work.

#### SNS-02 · Linter configured — 5 pts {#sns-02}
eslint/biome, ruff, golangci-lint, rubocop, or equivalent.
**Correção:** every convention expressible as a lint rule stops needing prose.

#### SNS-03 · Type checking in place — 4 pts {#sns-03}
tsconfig (ideally `strict: true`), mypy/pyright, or a statically typed
language.
**Correção:** the type checker is the only sensor that reviews every agent edit
for free — [capítulo 4](./sensors-feedback#type-checking-the-free-sensor).

#### SNS-04 · Formatter configured — 3 pts {#sns-04}
prettier/biome, black/ruff-format, gofmt/rustfmt.
**Correção:** formatting noise in diffs hides real mistakes from review.

#### SNS-05 · Test files exist — 2 pts {#sns-05}
At least one actual test file in the tree.
**Correção:** a configured runner with zero tests is a green light nobody earned.

### CI Feedback (14 pts)

#### CI-01 · CI pipeline configured — 4 pts {#ci-01}
GitHub Actions workflow (or GitLab/CircleCI/Jenkins equivalent).
**Correção:** add `.github/workflows/ci.yml` running your sensors on every push.

#### CI-02 · CI runs the tests — 4 pts {#ci-02}
**Correção:** no agent-authored change should be mergeable without the suite
firing.

#### CI-03 · CI runs lint/typecheck — 3 pts {#ci-03}
**Correção:** cheap computational sensors belong on every push — keep quality
left.

#### CI-04 · Pre-commit checks installed — 3 pts {#ci-04}
husky/lint-staged, `pre-commit`, or lefthook.
**Correção:** the earliest feedback a commit can get; catches what on-edit hooks
missed before it enters history.

### Hygiene & Safety (23 pts)

#### HYG-01 · .gitignore present — 2 pts {#hyg-01}
**Correção:** agents commit what they see; make build output and local state
invisible.

#### HYG-02 · .gitignore covers env files — 3 pts {#hyg-02}
A `.env` pattern in .gitignore.
**Correção:** add `.env` and `.env.*` (allow `!.env.example`) — the cheapest
guardrail in existence.

#### HYG-03 · No unprotected .env files — 4 pts {#hyg-03}
No real env files in the tree unless gitignored (templates are fine).
**Correção:** move secrets out; keep `.env.example` documenting required
variables.

#### HYG-04 · MCP config free of credentials — 4 pts {#hyg-04}
No credential signatures in MCP config (`.cursor/mcp.json`, `.mcp.json`,
`.agents/mcp_config.json`).
**Correção:** use `${ENV_VAR}` interpolation — an inlined key in MCP config is a
secret published to every clone.

#### HYG-05 · License present — 2 pts {#hyg-05}
**Correção:** add a LICENSE; required for open-source use and plugin marketplaces.

#### HYG-06 · No secrets in harness files — 2 pts {#hyg-06}
AGENTS.md, rules, and hooks config are clean of token signatures.
**Correção:** these files are loaded into model context every session — a key
there is exfiltrated by design.

#### HYG-07 · Lockfile committed — 3 pts {#hyg-07}
package-lock.json, uv.lock, Cargo.lock, go.sum, or equivalent.
**Correção:** reproducible installs mean your sensors test the same dependency
tree everywhere.

#### HYG-08 · MCP config uses env interpolation for credentials — 3 pts {#hyg-08}
An MCP config file is valid, and any credential-shaped field (token, key,
secret, password…) uses `${ENV_VAR}` interpolation rather than a literal.
The positive complement to HYG-04 — a repo with no MCP setup earns nothing
here, same as any other bonus check.
**Correção:** reference secrets as `"${VAR_NAME}"` and document required
variables in `.env.example`.

## Plano de melhoria prático

Partindo de repo de produto típico em L0, uma sessão focada por nível:

1. **→ L1 (uma tarde).** Escreva `AGENTS.md` (CTX-01/02). Inclua comandos build/test
   mesmo com sensores fracos — o agente usará.
2. **→ L2 (um dia).** Três rules com escopo + uma skill para procedimento mais repetido
   (CTX-03…06, SKL-01/02). Corrija higiene: gitignore, env files,
   licença (HYG-01…05).
3. **→ L3 (trabalho real, se sensores faltarem).** Test runner + linter +
   tipos strict + `ci.yml` rodando os três (SNS-*, CI-01…03). Se já
   tiver, este nível é grátis.
4. **→ L4 (uma manhã).** Os dois hooks do capítulo 5 — um gate, um
   formatter — commitados com scripts (HKS-*), pre-commit (CI-04),
   depois `--min-level 4` no CI para nunca regredir.
