# Medir y mejorar

Todo en esta guía condensa en un comando:

```bash
npx harness-score
```

El escáner recorre tu repositorio (solo filesystem — sin LLM, sin red, sin
telemetría), corre 36 checks deterministas en cualquier herramienta de IA y reporta
un nivel de madurez con los gaps exactos al siguiente:

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

> **Multi-herramienta:** El escáner reconoce artefactos de harness de Cursor, Claude Code,
> Windsurf, Cline, Continue y otras herramientas vía semántica OR — si configuras
> cualquiera, Harness Score lo cuenta. Más en [Soporte multi-harness](./multi-harness).

## Instalación

```bash
npx harness-score                                       # no install
npm install -g harness-score                            # global binary
npm install --save-dev harness-score                    # pinned devDependency
```

También espejado en [GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
(`@paladini/harness-score`) y [JSR](https://jsr.io/@paladini/harness-score)
para proyectos Deno/Bun.

## Usándolo como biblioteca

La CLI es un wrapper fino sobre API programática totalmente tipada — útil
para dashboard custom, bot o herramienta que quiere el `Report` crudo
en lugar de parsear salida de terminal:

```ts
import { score } from 'harness-score';

const report = score('/path/to/repo');
console.log(report.level.name, report.score.percent, report.dimensions);
```

`Report`, `Check`, `CheckResult`, `DimensionScore`, `LevelInfo` y toda
forma shipan como declaraciones TypeScript — resueltas vía campo `"types"`
explícito, para editores y `tsc` sin config extra. Bloques de nivel inferior
también se exportan, para lo que `score()` no cubre directamente:

```ts
import { createScanContext, buildReport, computeDiff, renderMarkdown } from 'harness-score';

const ctx = createScanContext('/path/to/repo');   // walk the filesystem once
const report = buildReport(ctx);                  // run all 36 checks against it
const markdown = renderMarkdown(report);          // same renderer the CLI's --md uses
```

## Referencia CLI

```bash
harness-score [path]              # human report (default: current directory)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report (use "-" for stdout)
harness-score --badge badge.svg   # SVG pill: harness + detected level (L0–L4)
harness-score --min-level 3       # exit 1 if below L3 — the CI gate
harness-score --diff base.json    # compare against a previous --json report
```

### Seguir puntuación en el tiempo {#diff-mode}

`--diff <file>` compara el scan actual contra reporte baseline guardado de
ejecución `--json` anterior — deltas de nivel y puntuación, movimiento por
dimensión y exactamente qué checks cambiaron:

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

`--diff` funciona con `--json` (agrega `current`/`baseline`/`diff` al
payload) y `--md` (agrega sección "Compared to baseline") — es lo que la
GitHub Action usa para comentar "puntuación subió de L2 a L3" en PRs.

## El plugin Cursor {#the-cursor-plugin}

Instala **Harness Score** desde [su directorio de plugin en este repo](https://github.com/paladini/harness-score/tree/main/plugins/cursor)
(listado Cursor Marketplace enviado y pendiente de revisión — este enlace
moverá allí cuando esté live) y obtienes:

- **`/harness-audit`** — corre el escáner en el workspace abierto y hace que el
  agente presente el reporte con las principales remediaciones.
- **La skill `harness-engineering`** — cuando dices "arréglalo" o
  "mejora mi harness", el agente sabe escribir los artefactos faltantes
  siguiendo las recetas de esta guía.

El análisis en sí es siempre la CLI determinista; el modelo solo presenta
resultados y aplica correcciones que pidas.

## El gate de CI {#ci-gate}

Los harnesses regresan en silencio — alguien borra `hooks.json` en una limpieza,
una rule se pudre. Traba tu nivel en CI:

```yaml
- name: Harness gate
  run: npx -y harness-score --min-level 3
```

O usa la action empaquetada, que también emite el badge:

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
    badge: 'harness-badge.svg'
```

## Muestra tu madurez {#show-your-maturity}

Harness Score entrega **dos formatos SVG con marca** en el mismo lenguaje visual
de las barras de progreso del escáner — sin shields.io, sin servicio pago, sin red
al renderizar:

| Formato | Archivos | Muestra | Mejor para |
|---|---|---|---|
| **Badge** | `harness-badge.svg` o `badge-l0.svg` … `badge-l4.svg` | `harness` · `L4` | Fila README (píldora 112×20) |
| **Share card** | `card-l0.svg` … `card-l4.svg` | Banner completo con nombre de nivel | Posts sociales, hero del repo (860×240) |

El badge muestra **solo el nivel** (`L0`–`L4`). Nombres de nivel
(Unharnessed, Guided, …) viven en share cards y en la salida del escáner.

La píldora se ve idéntica si CI regenera o fijas archivo estático —
solo cambia el cableado.

### Badge — auto-actualizando (recomendado)

`harness-score --badge` escribe SVG para el nivel que detecta el escáner.
Configúralo en CI una vez; la imagen en README se actualiza conforme mejora el harness.

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

Referencia el archivo publicado desde tu README — recetas copy-paste completas en
[Snippets de embed](#embed-snippets):

```md
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

Set `height="20"` on the `<img>` so the pill lines up with npm/CI shields in
the same row (112×20 SVG; level only — score percent stays in the CLI report).

Dogfood example (this guide's live badge on GitHub Pages):

<div class="hs-visual">
  <p class="hs-visual-label">Badge (this repo)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" src="/harness-badge.svg" alt="Harness Score" height="20">
  </div>
</div>

The matching share card for the detected level is published as
`harness-card.svg` (currently L4 for this repository):

<img class="hs-share-card" src="/harness-card.svg" alt="Harness Score L4 · Self-correcting">

### Badge — pin a level

Same pill, static file — pick `badge-l0.svg` … `badge-l4.svg` if you do not
want CI to regenerate the image. See [Embed snippets](#embed-snippets) for
Markdown, HTML, iframe, JSX, and more.

### Share card

For a hero image or social post, use the banner card — it includes the level
name (`Unharnessed`, `Guided`, …):

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
  <p class="hs-visual-detail">Descarga cualquier nivel de la tabla — las cards incluyen el nombre del nivel.</p>
</div>

## Snippets de embed {#embed-snippets}

Recetas copy-paste para compartir. Reemplaza placeholders:

| Placeholder | Badge auto-actualizando | Badge fijo (nivel `{N}`) | Share card |
|---|---|---|---|
| `{BADGE_URL}` | `https://raw.githubusercontent.com/{owner}/{repo}/badges/harness-badge.svg` | `https://paladini.github.io/harness-score/maturity/badge-l{N}.svg` | — |
| `{CARD_URL}` | — | — | `https://paladini.github.io/harness-score/maturity/card-l{N}.svg` |
| `{LINK}` | Tu repo o `https://paladini.github.io/harness-score/` | Igual | Igual |

`{N}` es `0`–`4`. Badge live de este repo (sin CI en tu fork):
`https://raw.githubusercontent.com/paladini/harness-score/main/docs/public/harness-badge.svg`

**Tamaño del badge:** 112×20 — siempre define `height="20"` (o `height={20}`) para
que la píldora alinee con badges shields.io en la misma fila.

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

Paste in chat, Notion image block, Slack, Discord, or any tool that accepts a
raw image URL:

```text
{BADGE_URL}
```

### Share card — Markdown / HTML

Banner for README hero, blog posts, or social previews (`{N}` = `0`–`4`):

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

### Worked example (pinned L3 badge)

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

> **shields.io fan?** Your Action can also write a small JSON file and point a
> [shields endpoint](https://shields.io/badges/endpoint-badge) at it
> (`{ "schemaVersion": 1, "label": "harness", "message": "L3", "color": "brightgreen" }`).
> The brand SVGs above are self-contained and need no third party.

## Catálogo de checks {#the-check-catalog}

Cada check que corre el escáner, con receta de remediación. Los IDs de check son
estables; la CLI enlaza cada fallo a su entrada aquí.

### Context & Guides (20 pt)

#### CTX-01 · Agent context file present — 4 pts {#ctx-01}
An `AGENTS.md` (or `CLAUDE.md` / `GEMINI.md`) exists at the repository root.
**Corrección:** create `AGENTS.md` answering: what is this project, how do I build
and test it, what conventions hold, what must I never touch. Recipe in
[capítulo 3](./guides-feedforward#writing-an-agents-md-that-works).

#### CTX-02 · Context file is substantive — 3 pts {#ctx-02}
≥20 meaningful lines and ≥2 headings — a stub scores nothing.
**Corrección:** cover layout, build & test commands, conventions, and no-go zones.
Commands over descriptions; point to rules instead of pasting them.

#### CTX-03 · Scoped rules in use — 4 pts {#ctx-03}
At least one scoped rule file for any supported tool (e.g. `.cursor/rules/*.mdc`,
`.windsurf/rules/*.md`, `.clinerules/*.md`, `.continue/rules/*.md`,
`.github/instructions/*.instructions.md`, `.agents/rules/*`). Nested context
files in subdirectories (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` anywhere below
the root) also count — they are directory-scoped rules in tools like Claude
Code and Codex.
**Corrección:** start with one short always-on rule holding your non-negotiables,
then add path-scoped rules per area (or nested context files per subtree).

#### CTX-04 · Rules have valid frontmatter — 3 pts {#ctx-04}
Every rule declares activation metadata (`description`, `globs`/`trigger`/`paths`/`applyTo`, or `alwaysApply`).
Rules a tool auto-loads without metadata — `.continue/rules/*` and nested
context files — pass by construction.
**Corrección:** add the frontmatter block; without it the agent can't decide when the
rule applies.

#### CTX-05 · Rules are scoped — 2 pts {#ctx-05}
Not every rule is blanket always-on. Nested context files count as scoped —
they apply only to their subtree.
**Corrección:** scope rules to paths (`globs:`, `trigger:` glob, `paths:`, `applyTo:`)
so they load only when relevant — every always-on rule taxes every request's context.

#### CTX-06 · No bloated rules — 2 pts {#ctx-06}
No single rule exceeds 500 lines.
**Corrección:** split by concern, or move procedural content into a skill.

#### CTX-07 · README present — 1 pt {#ctx-07}
**Corrección:** add a README.md; it's the first orientation document for humans and
a fallback for agents.

#### CTX-08 · No legacy .cursorrules — 1 pt {#ctx-08}
The deprecated single-file format is absent (or modern scoped rules also exist).
**Corrección:** migrate `.cursorrules` content into scoped rules for your tool.

### Skills & Commands (17 pts)

#### SKL-01 · At least one skill — 4 pts {#skl-01}
A `SKILL.md` under `.cursor/skills/<name>/`, `.claude/skills/<name>/`, or `.agents/skills/<name>/`.
**Corrección:** package your most repeated procedure (deploy, release, migration)
as a skill — [capítulo 3](./guides-feedforward#skills-the-procedural-layer).

#### SKL-02 · Skills declare name and description — 3 pts {#skl-02}
Frontmatter with `name:` and `description:` on every skill.
**Corrección:** the agent decides whether to load a skill from these two fields
alone; without them the skill is invisible.

#### SKL-03 · Explicit workflows/commands defined — 3 pts {#skl-03}
Command or workflow files (`.cursor/commands/`, `.windsurf/workflows/`,
`.claude/commands/`, `.continue/prompts/`, `.zed/commands/`, `.agents/workflows/`).
**Corrección:** encode workflows you trigger deliberately (`/review`, `/release`)
as command/workflow files.

#### SKL-04 · Skill descriptions are trigger-worthy — 2 pts {#skl-04}
Descriptions ≥40 characters.
**Corrección:** write descriptions as trigger conditions — "Use when the user asks
to deploy or release; covers tagging, pipeline, rollback, smoke tests."

#### AGT-01 · Custom subagent defined — 3 pts {#agt-01}
A subagent file under `.cursor/agents/`, `.claude/agents/`, or `.opencode/agents/`.
**Corrección:** package a purpose-built subagent for a job the primary agent should
delegate (planning, review, release) — see
[Subagents](./cursor-harness-surface#subagents-purpose-built-delegates)
en el capítulo 2.

#### AGT-02 · Subagents declare name and description — 2 pts {#agt-02}
Frontmatter with `name:` and `description:` on every subagent definition.
**Corrección:** the parent agent decides whether to delegate from these two fields
alone; without them the subagent is never invoked.

### Hooks & Guardrails (14 pts)

#### HKS-01 · Hooks configuration present and valid — 4 pts {#hks-01}
`.cursor/hooks.json` or `.claude/settings.json` (`hooks` key) exists and parses as JSON.
**Corrección:** create hooks config and grow from the
recetas en el [capítulo 5](./guardrails-and-safety#gate-hooks).

#### HKS-02 · Known events, version declared — 2 pts {#hks-02}
Version/metadata present; every registered event is documented for your tool
(Cursor lifecycle events, or Claude Code `PreToolUse`/`PostToolUse`).
**Corrección:** typo'd event names fail silently — check against the event list in
[capítulo 2](./cursor-harness-surface#hooks-observe-and-control-the-agent-loop).

#### HKS-03 · Gate hook guards risky operations — 4 pts {#hks-03}
A gate hook registered (Cursor: `beforeShellExecution`, `beforeMCPExecution`,
`preToolUse`, or `beforeReadFile`; Claude Code: `PreToolUse`).
**Corrección:** gate de deny de comandos destructivos del capítulo 5 — rules en prosa son
pedidos; gates son hechos.

#### HKS-04 · Feedback hook observes output — 2 pts {#hks-04}
A feedback hook registered (Cursor: `afterFileEdit`, `postToolUse`, …;
Claude Code: `PostToolUse`).
**Corrección:** format-and-lint on edit gives the agent instant feedback inside the
session.

#### HKS-05 · Hook scripts committed — 2 pts {#hks-05}
Scripts referenced by the hooks config exist in the repository.
**Corrección:** commit them; a hook pointing at a missing script fails open on
every machine but the author's.

### Sensors & Feedback (20 pts)

#### SNS-01 · Test runner configured — 6 pts {#sns-01}
A real test script/config (vitest, jest, pytest, go test, cargo test…).
**Corrección:** wire up the runner with one obvious entry point and document it in
AGENTS.md — tests are how the agent verifies its own work.

#### SNS-02 · Linter configured — 5 pts {#sns-02}
eslint/biome, ruff, golangci-lint, rubocop, or equivalent.
**Corrección:** every convention expressible as a lint rule stops needing prose.

#### SNS-03 · Type checking in place — 4 pts {#sns-03}
tsconfig (ideally `strict: true`), mypy/pyright, or a statically typed
language.
**Corrección:** the type checker is the only sensor that reviews every agent edit
for free — [capítulo 4](./sensors-feedback#type-checking-the-free-sensor).

#### SNS-04 · Formatter configured — 3 pts {#sns-04}
prettier/biome, black/ruff-format, gofmt/rustfmt.
**Corrección:** formatting noise in diffs hides real mistakes from review.

#### SNS-05 · Test files exist — 2 pts {#sns-05}
At least one actual test file in the tree.
**Corrección:** a configured runner with zero tests is a green light nobody earned.

### CI Feedback (14 pts)

#### CI-01 · CI pipeline configured — 4 pts {#ci-01}
GitHub Actions workflow (or GitLab/CircleCI/Jenkins equivalent).
**Corrección:** add `.github/workflows/ci.yml` running your sensors on every push.

#### CI-02 · CI runs the tests — 4 pts {#ci-02}
**Corrección:** no agent-authored change should be mergeable without the suite
firing.

#### CI-03 · CI runs lint/typecheck — 3 pts {#ci-03}
**Corrección:** cheap computational sensors belong on every push — keep quality
left.

#### CI-04 · Pre-commit checks installed — 3 pts {#ci-04}
husky/lint-staged, `pre-commit`, or lefthook.
**Corrección:** the earliest feedback a commit can get; catches what on-edit hooks
missed before it enters history.

### Hygiene & Safety (23 pts)

#### HYG-01 · .gitignore present — 2 pts {#hyg-01}
**Corrección:** agents commit what they see; make build output and local state
invisible.

#### HYG-02 · .gitignore covers env files — 3 pts {#hyg-02}
A `.env` pattern in .gitignore.
**Corrección:** add `.env` and `.env.*` (allow `!.env.example`) — the cheapest
guardrail in existence.

#### HYG-03 · No unprotected .env files — 4 pts {#hyg-03}
No real env files in the tree unless gitignored (templates are fine).
**Corrección:** move secrets out; keep `.env.example` documenting required
variables.

#### HYG-04 · MCP config free of credentials — 4 pts {#hyg-04}
No credential signatures in MCP config (`.cursor/mcp.json`, `.mcp.json`,
`.agents/mcp_config.json`).
**Corrección:** use `${ENV_VAR}` interpolation — an inlined key in MCP config is a
secret published to every clone.

#### HYG-05 · License present — 2 pts {#hyg-05}
**Corrección:** add a LICENSE; required for open-source use and plugin marketplaces.

#### HYG-06 · No secrets in harness files — 2 pts {#hyg-06}
AGENTS.md, rules, and hooks config are clean of token signatures.
**Corrección:** these files are loaded into model context every session — a key
there is exfiltrated by design.

#### HYG-07 · Lockfile committed — 3 pts {#hyg-07}
package-lock.json, uv.lock, Cargo.lock, go.sum, or equivalent.
**Corrección:** reproducible installs mean your sensors test the same dependency
tree everywhere.

#### HYG-08 · MCP config uses env interpolation for credentials — 3 pts {#hyg-08}
An MCP config file is valid, and any credential-shaped field (token, key,
secret, password…) uses `${ENV_VAR}` interpolation rather than a literal.
The positive complement to HYG-04 — a repo with no MCP setup earns nothing
here, same as any other bonus check.
**Corrección:** reference secrets as `"${VAR_NAME}"` and document required
variables in `.env.example`.

## Plan de mejora práctico

Partiendo de un repo de producto típico en L0, una sesión enfocada por nivel:

1. **→ L1 (una tarde).** Escribe `AGENTS.md` (CTX-01/02). Incluye comandos build/test
   aunque los sensores sean débiles — el agente los usará.
2. **→ L2 (un día).** Tres rules con alcance + una skill para el procedimiento más repetido
   (CTX-03…06, SKL-01/02). Corrige higiene: gitignore, env files,
   licencia (HYG-01…05).
3. **→ L3 (el trabajo real, si faltan sensores).** Test runner + linter +
   tipos strict + `ci.yml` corriendo los tres (SNS-*, CI-01…03). Si ya
   los tienes, este nivel es gratis.
4. **→ L4 (una mañana).** Los dos hooks del capítulo 5 — un gate, un
   formatter — commiteados con scripts (HKS-*), pre-commit (CI-04),
   luego `--min-level 4` en CI para que nunca regrese.
