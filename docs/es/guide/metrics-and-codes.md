# Referencia de métricas y códigos

Hoja de referencia densa para todo lo que reporta `harness-score`: puntajes, scopes,
niveles, dimensiones, IDs de check, claves de configuración, flags de CLI, inputs de Action
y campos JSON. Las recetas de remediación están en
[capítulo 8 — Medir y mejorar](./measure-and-improve#the-check-catalog).

## Puntajes: maturity vs effective {#scores-maturity-vs-effective}

| Código | Qué incluye | Se usa para |
|---|---|---|
| **maturity** | Solo archivos del repositorio (`scopes: repo`) | Gate de CI por defecto, badge, `--min-level`, madurez oficial del equipo |
| **effective** | Repo ∪ scopes globales/extras configurados | Local: “lo que el agente ve en esta máquina” cuando el harness user/system está habilitado |

Sin scopes extra configurados, `effective` iguala `maturity` (mismo nivel,
puntaje y checks). El reporte siempre incluye ambos bloques para JSON estable.

Define qué puntaje hace gate en CI con `gate` en config, `--gate` o el input `gate`
de la Action (`maturity` por defecto).

## Scopes {#scopes}

| Scope | Significado | Qué se escanea |
|---|---|---|
| `repo` | Siempre activo | El directorio que pasas a `harness-score` (default `.`) |
| `user` | Opt-in | Rutas allowlisted a nivel usuario: `~/.cursor/*`, `~/.claude/*`, `~/.codex/skills`, `~/.agents/skills`, `~/.config/opencode/agents`, configs globales de MCP/hooks, etc. |
| `system` | Opt-in | Reservado para instalaciones validadas a nivel sistema (mínimo en v1) |
| `extraRoots` | Opt-in | Directorios adicionales (relativos o absolutos) cuyo árbol refleja el layout del harness — ej.: checkout compartido de harness del equipo |

Los archivos del proyecto **ganan** sobre rutas de overlay en conflicto (misma ruta relativa).

**No escaneado:** Cursor User Rules guardadas solo en la UI del IDE (no en disco),
recorridos arbitrarios del home directory, o contenido de secretos en strings de evidencia.

## Niveles (L0–L4)

Los nombres oficiales de nivel aplican a **maturity**, salvo que definas `gate: effective`.

| Nivel | Nombre | Requisitos (todos los niveles anteriores +) |
|---|---|---|
| L0 | Unharnessed | — |
| L1 | Documented | context ≥ 40% |
| L2 | Guided | context ≥ 60%; skills ≥ 30% **o** hooks ≥ 30%; hygiene ≥ 50% |
| L3 | Sensing | sensors ≥ 60%; ci ≥ 50% |
| L4 | Self-correcting | hooks ≥ 70%; total ≥ 80% |

Narrativa completa: [El modelo de madurez](./maturity-model).

## Dimensiones

| ID | Título | Pts máx | Mide |
|---|---|---|---|
| `context` | Context & Guides | 20 | AGENTS.md, rules con scope, README |
| `skills` | Skills & Commands | 17 | Skills, commands/workflows, subagents |
| `hooks` | Hooks & Guardrails | 14 | hooks.json / hooks en settings de Claude |
| `sensors` | Sensors & Feedback | 20 | Tests, linter, tipos, formatter |
| `ci` | CI Feedback | 14 | Pipeline, pre-commit |
| `hygiene` | Hygiene & Safety | 23 | .gitignore, secretos, lockfile, licencia, higiene MCP |

**Total:** 108 puntos.

## Catálogo de checks

IDs estables — vinculados a remediación en [Medir y mejorar](./measure-and-improve#the-check-catalog).

### Context & Guides

| ID | Pts | Analiza exactamente | Remediación |
|---|---|---|---|
| CTX-01 | 4 | Existe `AGENTS.md`, `CLAUDE.md` o `GEMINI.md` en la raíz | [ctx-01](./measure-and-improve#ctx-01) |
| CTX-02 | 3 | El archivo de contexto tiene ≥20 líneas significativas y ≥2 headings | [ctx-02](./measure-and-improve#ctx-02) |
| CTX-03 | 4 | Al menos un archivo de rule con scope (cualquier herramienta soportada) o archivo de contexto anidado | [ctx-03](./measure-and-improve#ctx-03) |
| CTX-04 | 3 | Toda rule declara metadatos de activación en frontmatter | [ctx-04](./measure-and-improve#ctx-04) |
| CTX-05 | 2 | No toda rule es always-on genérica | [ctx-05](./measure-and-improve#ctx-05) |
| CTX-06 | 2 | Ningún archivo de rule único supera 500 líneas | [ctx-06](./measure-and-improve#ctx-06) |
| CTX-07 | 1 | `README.md` en la raíz del repositorio | [ctx-07](./measure-and-improve#ctx-07) |
| CTX-08 | 1 | Sin `.cursorrules` legacy sin rules modernas con scope | [ctx-08](./measure-and-improve#ctx-08) |

### Skills & Commands

| ID | Pts | Analiza exactamente | Remediación |
|---|---|---|---|
| SKL-01 | 4 | Al menos un `SKILL.md` bajo directorio de skills reconocido | [skl-01](./measure-and-improve#skl-01) |
| SKL-02 | 3 | Toda skill tiene `name:` y `description:` en frontmatter | [skl-02](./measure-and-improve#skl-02) |
| SKL-03 | 3 | Existen archivos command/workflow para cualquier herramienta soportada | [skl-03](./measure-and-improve#skl-03) |
| SKL-04 | 2 | Las descripciones de skill tienen ≥40 caracteres | [skl-04](./measure-and-improve#skl-04) |
| AGT-01 | 3 | Al menos un archivo markdown de subagent | [agt-01](./measure-and-improve#agt-01) |
| AGT-02 | 2 | Todo subagent tiene frontmatter `name:` y `description:` | [agt-02](./measure-and-improve#agt-02) |

### Hooks & Guardrails

| ID | Pts | Analiza exactamente | Remediación |
|---|---|---|---|
| HKS-01 | 4 | La config de hooks existe y parsea como JSON | [hks-01](./measure-and-improve#hks-01) |
| HKS-02 | 2 | Los hooks declaran version/metadata y nombres de evento conocidos | [hks-02](./measure-and-improve#hks-02) |
| HKS-03 | 4 | Hook clase gate registrado (shell/MCP/read/tool gate) | [hks-03](./measure-and-improve#hks-03) |
| HKS-04 | 2 | Hook clase feedback registrado (post-edit/tool) | [hks-04](./measure-and-improve#hks-04) |
| HKS-05 | 2 | Toda ruta de script de hook referenciada en config existe en el repo | [hks-05](./measure-and-improve#hks-05) |

### Sensors & Feedback

| ID | Pts | Analiza exactamente | Remediación |
|---|---|---|---|
| SNS-01 | 6 | Test runner configurado (script en `package.json`, pytest, go test, etc.) | [sns-01](./measure-and-improve#sns-01) |
| SNS-02 | 5 | Linter configurado (eslint, biome, ruff, golangci-lint, …) | [sns-02](./measure-and-improve#sns-02) |
| SNS-03 | 4 | Type checking configurado (tsconfig, mypy, pyright, …) | [sns-03](./measure-and-improve#sns-03) |
| SNS-04 | 3 | Formatter configurado (prettier, black, gofmt, …) | [sns-04](./measure-and-improve#sns-04) |
| SNS-05 | 2 | Al menos un archivo de test existe en el árbol | [sns-05](./measure-and-improve#sns-05) |

### CI Feedback

| ID | Pts | Analiza exactamente | Remediación |
|---|---|---|---|
| CI-01 | 4 | Archivo de pipeline CI presente (GitHub Actions, GitLab CI, …) | [ci-01](./measure-and-improve#ci-01) |
| CI-02 | 4 | CI ejecuta la suite de tests | [ci-02](./measure-and-improve#ci-02) |
| CI-03 | 4 | CI ejecuta lint o typecheck | [ci-03](./measure-and-improve#ci-03) |
| CI-04 | 2 | Herramienta pre-commit o git hook instalada | [ci-04](./measure-and-improve#ci-04) |

### Hygiene & Safety

| ID | Pts | Analiza exactamente | Remediación |
|---|---|---|---|
| HYG-01 | 4 | `.gitignore` presente | [hyg-01](./measure-and-improve#hyg-01) |
| HYG-02 | 3 | `.gitignore` cubre archivos de entorno | [hyg-02](./measure-and-improve#hyg-02) |
| HYG-03 | 4 | Sin archivos `.env` desprotegidos (sin patrón `.env.example`) | [hyg-03](./measure-and-improve#hyg-03) |
| HYG-04 | 4 | Configs JSON de MCP sin patrones inline de credencial | [hyg-04](./measure-and-improve#hyg-04) |
| HYG-05 | 2 | Archivo `LICENSE` presente | [hyg-05](./measure-and-improve#hyg-05) |
| HYG-06 | 3 | Sin firmas tipo credencial en markdown/JSON de harness | [hyg-06](./measure-and-improve#hyg-06) |
| HYG-07 | 3 | Lockfile de dependencias commiteado | [hyg-07](./measure-and-improve#hyg-07) |
| HYG-08 | 4 | Configs MCP usan interpolación de env para secretos | [hyg-08](./measure-and-improve#hyg-08) |

## Archivo de configuración (`.harness-score.json`) {#configuration-file-harness-scorejson}

JSON opcional en la raíz del scan (schema estricto — claves desconocidas generan error):

```json
{
  "scopes": {
    "user": false,
    "system": false
  },
  "extraRoots": [
    { "id": "team-shared", "path": "../shared-harness" }
  ],
  "gate": "maturity"
}
```

| Clave | Tipo | Default | Significado |
|---|---|---|---|
| `scopes.user` | boolean | `false` | Incluir overlay de harness a nivel usuario |
| `scopes.system` | boolean | `false` | Incluir overlay a nivel sistema |
| `extraRoots` | `{ id, path }[]` | `[]` | Árboles extra de harness fusionados en effective |
| `gate` | `"maturity"` \| `"effective"` | `"maturity"` | Qué puntaje usa `--min-level` |

Precedencia: **flags de CLI → inputs de Action → archivo de config → defaults**.

## Flags de CLI (configuración del scan)

| Flag | Significado |
|---|---|
| `--config <file>` | Cargar config desde ruta específica |
| `--scope user` | Habilitar scope user (separados por coma: `user`, `system`) |
| `--gate maturity\|effective` | Puntaje usado para `--min-level` |
| `--min-level <0-4>` | Exit 1 cuando el puntaje gated está bajo el nivel |
| `--json` | Reporte completo incluyendo `scopes`, `gate`, `effective` |

## Inputs de GitHub Action

| Input | Default | Significado |
|---|---|---|
| `include-user-harness` | `false` | Pasa `--scope user` |
| `include-system-harness` | `false` | Pasa `--scope system` |
| `gate` | `maturity` | Pasa `--gate` |
| `config` | `''` | Pasa `--config` cuando está definido |
| `min-level` | `0` | Falla cuando el puntaje gated está bajo el nivel |

Outputs: `level`, `level-name`, `percent` (maturity); `effective-level`, `effective-percent`.

## Campos JSON del reporte (estables)

| Campo | Descripción |
|---|---|
| `root` | Raíz absoluta del scan |
| `scopes.maturity` | Siempre `["repo"]` |
| `scopes.effective` | ej.: `["repo"]`, `["repo","user"]` |
| `gate` | `"maturity"` o `"effective"` |
| `resolvedRoots` | Lista opcional de `{ scope, absPath }` para overlays |
| `level`, `score`, `dimensions`, `checks` | Snapshot de **maturity** |
| `effective` | Misma forma: `{ level, score, dimensions, checks, detectedHarnesses }` |
| `detectedHarnesses` | Herramientas vistas en el **repo** (informativo) |
| `truncated` | El walk alcanzó límite de archivos |

`--diff` compara campos de **maturity** por defecto (top-level `level` / `score` / `checks`).
