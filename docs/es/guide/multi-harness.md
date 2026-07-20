# Soporte multi-harness

Desde **v0.4.0**, Harness Score mide la madurez del harness de código con IA en **cualquier herramienta** — no solo Cursor. Ya uses Cursor, Claude Code, Windsurf, Cline, Continue, Codex u otro IDE/editor AI-first, aplica el mismo modelo de 108 puntos.

## Por qué importa multi-harness

El harness es agnóstico de herramienta. Un `AGENTS.md` bien escrito, un `.gitignore` que protege secretos, un pipeline CI que corre tests — funcionan igual para Cursor, Claude Code, Windsurf u otro agente. La infraestructura de harness que construyes una vez beneficia a *toda* herramienta de IA en el proyecto.

Harness Score lo hace explícito: mides una vez, cualquier herramienta se beneficia. No construyes harness Cursor y harness Claude Code por separado — construyes *un harness*, y cada herramienta compatible hereda las partes que entiende.

## Cómo funciona: semántica OR

El escáner usa **semántica OR** para artefactos específicos de herramienta. Cada check pregunta "¿alguna herramienta reconocida provee esto?" — no "¿Cursor lo provee?". Por ejemplo:

- `.cursor/rules/*.mdc` **o** `.windsurf/rules/*.md` **o** `.clinerules/*.md` **o** un `CLAUDE.md` anidado → cuenta para **rules**
- `.cursor/hooks.json` **o** `.claude/settings.json` con sección `hooks` → cuenta para **hooks**
- `.cursor/skills/<name>/SKILL.md` **o** `.claude/skills/<name>/SKILL.md` → cuenta para **skills**
- `.cursor/agents/*.md` **o** `.claude/agents/*.md` **o** `.opencode/agents/*.md` → cuenta para **subagents**
- `AGENTS.md` en raíz **o** `CLAUDE.md` **o** `GEMINI.md` → cuenta para **guías de contexto**

No necesitas configurar todos — uno basta. Desde v0.5.0, agregar segunda herramienta nunca *baja* tu puntuación: cuando existen varias configs de hooks, gana la que tiene más eventos registrados.

## Herramientas soportadas

Harness Score reconoce estos artefactos (patrones exactos en el registry del escáner —
[`registry.ts`](https://github.com/paladini/harness-score/blob/main/packages/cli/src/harness/registry.ts)):

| Herramienta | Rules | Skills | Commands / workflows | Subagents | Hooks | MCP |
|---|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/*.mdc` | `.cursor/skills/*/SKILL.md` | `.cursor/commands/*.md` | `.cursor/agents/*.md` | `.cursor/hooks.json` | `.cursor/mcp.json` |
| **Claude Code** | `CLAUDE.md` anidados | `.claude/skills/*/SKILL.md` | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json` (`hooks`) | `.mcp.json` |
| **Windsurf** | `.windsurf/rules/*.md` | — | `.windsurf/workflows/*.md` | — | — | — |
| **Cline** | `.clinerules/*.md` | — | — | — | — | — |
| **Continue** | `.continue/rules/*.md` | — | `.continue/prompts/*` | — | — | — |
| **GitHub Copilot** | `.github/instructions/*.instructions.md` | — | — | — | — | — |
| **Codex** | `AGENTS.md` anidados | `.agents/skills/*/SKILL.md` | — | — | — | — |
| **Gemini / Antigravity** | `.agents/rules/`, `.agent/rules/`, `.gemini/rules/`, `GEMINI.md` anidados | `.agents/skills/*/SKILL.md` | `.agents/workflows/`, `.agent/workflows/` | — | — | `.agents/mcp_config.json`, `.agent/mcp_config.json` |
| **OpenCode** | — | — | — | `.opencode/agents/*.md` | — | — |
| **Zed** | — | — | `.zed/commands/*.md` | — | — | — |

Archivos de contexto en raíz (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) cuentan para toda herramienta.
Y los artefactos más importantes son **agnósticos de herramienta**: tests, CI, linters, type checkers, `.gitignore`, lockfiles y `SECURITY.md` puntúan igual sin importar la herramienta.

::: tip Columna escasa de una herramienta no es penalización
Windsurf no tiene sistema de hooks reconocido por el escáner — pero hooks son solo una dimensión de seis. Repo solo Windsurf con rules, sensores y CI fuertes aún sube a L3. L4 requiere gate hooks, lo que hoy significa `.cursor/hooks.json` o `settings.json` de Claude Code junto a la herramienta principal.
:::

## Construyendo el harness una vez

Camino típico de upgrade para repo multi-herramienta:

1. **Empieza con una herramienta** (ej.: Cursor). Escribe `AGENTS.md`, agrega `.cursor/rules/`, configura sensores (tests, lint, tipos, CI).
2. **El equipo agrega segunda herramienta** (ej.: Claude Code). Artefactos compartidos — `AGENTS.md`, tests, CI, higiene — ya funcionan. Agrega piezas nativas solo donde el comportamiento difiere: `CLAUDE.md` anidados para guía por directorio, `.claude/settings.json` para hooks.
3. **El harness queda en un lugar.** Sensores, guardrails y guías son nivel repo — toda herramienta hereda automáticamente.
4. **Exige madurez, no herramientas.** CI corre `harness-score --min-level 3` y mantiene la misma barra para todas.

## Ejemplos prácticos

### Ejemplo 1: Repo Cursor-first agrega Claude Code

Tienes repo con setup Cursor fuerte:

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

El equipo quiere usar Claude Code junto a Cursor. Nada es obligatorio —
la puntuación ya cuenta todo lo anterior. Para dar a sesiones Claude Code la
misma guía que Cursor recibe de `.cursor/rules/`, agrega equivalentes nativos:

- **Guía por directorio**: coloca `CLAUDE.md` en subdirectorios donde tus
  rules `.mdc` tenían alcance (`CLAUDE.md` anidados cuentan como rules con
  alcance desde v0.5.0). Muchos equipos hacen el `CLAUDE.md` raíz apuntar en
  una línea a `AGENTS.md` — o symlink — para fuente única de verdad.
- **Hooks**: espeja tu gate hook en `.claude/settings.json` (ver Ejemplo 3).
- **Subagents**: `.claude/agents/reviewer.md` cuenta para el mismo check que
  `.cursor/agents/reviewer.md`.

De cualquier forma, Harness Score cuenta la config más fuerte — agregar segunda
herramienta solo mantiene o sube la puntuación, nunca la baja.

### Ejemplo 2: Greenfield, multi-herramienta desde el día uno

Proyecto nuevo que usará Cursor y Windsurf. Construye una vez:

1. Escribe `AGENTS.md` en raíz.
2. Crea `.cursor/rules/` con convenciones de arquitectura y nomenclatura.
3. Espeja rules que Windsurf necesita en `.windsurf/rules/` (markdown
   simple, sin frontmatter `.mdc`).
4. Escribe tests, configura CI, agrega linter.
5. Corre `npx harness-score` → L2 o más. Ambas herramientas igualmente soportadas.

### Ejemplo 3: Hooks para seguridad (varias herramientas beneficiadas)

Agregas gate hook para bloquear comandos shell peligrosos. Formato Cursor:

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

Claude Code usa archivo y nombres de evento distintos, pero el mismo script:

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

Harness Score recompensa cualquiera en la dimensión Hooks & Guardrails — eventos
gate (`beforeShellExecution`, `PreToolUse`) satisfacen checks de gate hook,
y el script referenciado debe existir en el repo (scripts commiteados forman
parte de lo que validan los checks). Un script, dos configs, ambas herramientas
protegidas.

## Lógica de puntuación

El escáner evalúa cada dimensión vía semántica OR, luego asigna un **nivel de madurez** al repo. Umbrales (espejados de `LEVEL_REQUIREMENTS` del escáner):

- **L0 · Sin harness** → default; ningún requisito cumplido.
- **L1 · Documentado** → context ≥ 40% (guía raíz sustancial).
- **L2 · Guiado** → context ≥ 60%, skills ≥ 30% **o** hooks ≥ 30%, hygiene ≥ 50%.
- **L3 · Con sensores** → sensors ≥ 60% y CI ≥ 50%.
- **L4 · Autocorrección** → hooks ≥ 70% y puntuación total ≥ 80%.

El nivel aplica al repo entero, no por herramienta. Es intencional: tu objetivo es elevar la calidad general del trabajo asistido por IA en el proyecto, sin importar qué herramienta eligió el dev. El modelo completo, con rationale por umbral, está en el [modelo de madurez](./maturity-model).

## Migraciones y cambio de herramienta

Si cambias herramienta principal (ej.: Cursor → Claude Code), el harness transfiere gradualmente y la puntuación nunca cae en cliff:

1. Agrega artefactos nativos Claude (`CLAUDE.md` anidados, `.claude/skills/`, hooks en `.claude/settings.json`) junto a la config `.cursor/` existente.
2. Corre `npx harness-score` → **mismo nivel**, porque guías, tests, CI e higiene son agnósticos, y artefactos de ambas herramientas satisfacen los mismos checks.
3. Deprecia config `.cursor/` antigua cuando nadie use Cursor (opcional — mantener no cuesta nada).
4. Harness Score sigue reconociendo ambos — sin riesgo de regresión.

## Limitaciones y roadmap

**Actual (v1.0.0):**

- Soporte a plugins es escalonado: **Cursor** (principal, audit-and-fix completo), **Claude Code** (Fase 0, audit read-only), otros TBD (ver [PLUGINS-ROADMAP.md](https://github.com/paladini/harness-score/blob/main/PLUGINS-ROADMAP.md)).
- La CLI es tool-aware y totalmente multi-harness: reportes terminal y markdown muestran línea `Detected:` con toda herramienta reconocida, y `--json` incluye `detectedHarnesses`. Los plugins alcanzan con el tiempo.
- Hooks reconocidos solo para Cursor y Claude Code — sistemas de hooks de otras herramientas (conforme surjan) necesitan entradas en el registry.

**Planeado (post-1.0):**

- Scaffolding interactivo `harness-score init` (templates deterministas por herramienta).
- Salida SARIF para integración CI/seguridad enterprise.
- Mejoras en detector de ecosistema (más variantes y ubicaciones de config).

## FAQs

**P: ¿Debo configurar todas las herramientas soportadas?**

R: No. Si configuras Cursor, Harness Score lo cuenta. Si luego agregas artefactos Claude Code, ambos se reconocen — pero una herramienta bien configurada basta para puntuar bien.

**P: Si solo uso Cursor, ¿aún puedo compartir mi puntuación?**

R: Sí. El nivel de madurez es medida de repo, no de herramienta. Repo en L3 significa "trabajo asistido por IA bien gateado y verificado aquí" — no especifica *qué* herramienta. Al compartir el badge, es creíble uses Cursor, Claude Code o ambos.

**P: ¿Y si mi herramienta no está listada?**

R: Abre issue con el formato de config de la herramienta y agregaremos soporte. El camino más confiable mientras tanto es (1) usar `AGENTS.md` + sensores agnósticos (tests, linters, tipos, CI), que funcionan en todas partes, o (2) mapear artefactos de tu herramienta a los que ya reconocemos.

**P: ¿Puedo ver qué herramientas se detectaron?**

R: Sí — `npx harness-score --json` incluye array `detectedHarnesses`. Flujo CI típico:

```yaml
- name: Audit harness maturity
  run: npx harness-score --min-level 3

- name: Fail if no tool is configured
  run: npx harness-score --json | jq -e '.detectedHarnesses | length > 0'
```

Esto garantiza que el gate de madurez pasa *y* que se reconoció el harness de al menos una herramienta (`jq -e` sale non-zero cuando la expresión es `false`).
