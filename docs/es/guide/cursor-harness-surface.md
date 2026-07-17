# La superficie de harness de Cursor

Cursor expone más maquinaria de harness que cualquier otro editor de IA mainstream.
Este capítulo es el mapa: cada artefacto, dónde vive y qué trabajo hace en el
sistema de control.

> **Nota:** Harness Score soporta varias herramientas (Claude Code, Windsurf, Cline, Continue y otras) vía semántica OR. Este capítulo se centra en Cursor como ejemplo principal. Ver [Soporte multi-harness](./multi-harness) para cómo se reconocen y puntúan otras herramientas.

## Los artefactos de un vistazo

| Artefacto | Ruta | Familia | Cargado |
|---|---|---|---|
| Archivo de contexto del agente | `AGENTS.md` | Guía | Siempre |
| Rules | `.cursor/rules/*.mdc` | Guía | Siempre / por glob / por relevancia |
| Skills | `.cursor/skills/*/SKILL.md` | Guía | Bajo demanda, por description |
| Commands | `.cursor/commands/*.md` | Guía | Explícitamente, vía `/name` |
| Hooks | `.cursor/hooks.json` | Sensor + Guardrail | En eventos del loop del agente |
| Servidores MCP | `.cursor/mcp.json` | Guía (herramientas) | Por sesión |
| Subagents | definiciones de agente | Guía | Tareas delegadas |
| Plugins | Marketplace / `.cursor-plugin/` | Todo empaquetado | Instalado |

Todo vive en el repositorio — ese es el punto: **el harness viaja con el código**,
se versiona con el código y se revisa como código.

## AGENTS.md — la puerta de entrada

`AGENTS.md` en la raíz del repo es lo primero que lee un agente. Es convención
abierta (Cursor, Claude Code y la mayoría de herramientas agentic la honran) y el
archivo único de mayor palanca en tu harness. Debe responder, brevemente:

- ¿Qué es este proyecto y cómo está organizado?
- ¿Cómo construyo, ejecuto y **pruebo**?
- ¿Qué convenciones son innegociables?
- ¿Qué nunca debo tocar?

Mantén bajo ~150 líneas. Se carga en toda sesión — cada línea taxa la ventana de
contexto de toda tarea. Detalles que solo importan a veces pertenecen a rules con
alcance o skills.

## Rules — guía persistente y declarativa

Las rules son archivos markdown con frontmatter (`.mdc`) en `.cursor/rules/`.
Cada rule declara *cuándo aplica*:

```markdown
---
description: API route conventions
globs: src/api/**
---

- Every route validates input with zod before use.
- Errors return `{ "error": string }` and a correct status code.
```

Tres modos de activación:

- `alwaysApply: true` — inyectado en todo request. Reserva para innegociables de
  verdad; toda rule always-on es taxa permanente de contexto.
- `globs: <pattern>` — aplicada cuando archivos coincidentes están en juego.
  Modo workhorse: convenciones viven junto al código que gobiernan.
- Solo `description` — el agente decide relevancia por la description.

Directorios `.cursor/rules/` anidados funcionan en monorepos: coloca rules
específicas del paquete dentro del paquete.

El archivo legado `.cursorrules` está deprecado. Migra: divide por preocupación,
alcance por glob.

## Skills — conocimiento procedural bajo demanda

Una skill es carpeta con `SKILL.md` (estándar abierto Agent Skills):

```markdown
---
name: deploy
description: Use when the user asks to deploy or release; covers tagging,
  pipeline, and smoke tests.
---

# Deploying
1. …step-by-step workflow…
```

Cursor muestra al agente `name` + `description` de toda skill al inicio de sesión;
el cuerpo carga **solo cuando el agente juzga relevante**. Las skills son el
lugar correcto para contenido procedural largo que hincharía rules: runbooks de
deploy, recetas de migración, checklists de release, playbooks de debug.

Regla práctica: **rules son declarativas y semi-always-on ("use TypeScript strict"),
skills son procedurales y bajo demanda ("así desplegamos")**.
La description es el disparador — escríbela como "Use when…" o nunca dispara.

## Commands — workflows que invocas a propósito

Archivos markdown en `.cursor/commands/` se vuelven `/slash-commands`. A
diferencia de skills (disparadas por el agente), los commands son **disparados
por humanos**: workflows repetibles en superficie tipo atajo — `/review`,
`/release`, `/harness-audit`. Un archivo de command es simplemente el prompt que
corre al invocarse.

## Hooks — observar y controlar el loop del agente

`.cursor/hooks.json` registra scripts en eventos del ciclo de vida del agente:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "node ./.cursor/hooks/guard.js" }],
    "afterFileEdit": [{ "command": "node ./.cursor/hooks/format.js" }]
  }
}
```

Los scripts reciben JSON en stdin y responden en stdout — incluyendo decisiones
de permiso (`allow` / `deny` / `ask`) para eventos de gate. Eventos clave:

- **Gates** (pueden bloquear): `beforeShellExecution`, `beforeMCPExecution`,
  `preToolUse`, `beforeReadFile`
- **Feedback** (observan resultados): `afterFileEdit`, `postToolUse`,
  `afterShellExecution`, `stop`
- **Lifecycle**: `sessionStart` (inyecta contexto), `sessionEnd`, `preCompact`

Los hooks son el único mecanismo Cursor *impuesto por el runtime del harness* en
lugar de *sugerido al modelo*. Rule que dice "nunca corras comandos destructivos"
es pedido; hook `beforeShellExecution` que niega es hecho. El capítulo 5 expande
esta distinción.

## MCP — herramientas y conocimiento

`.cursor/mcp.json` conecta servidores Model Context Protocol: bases de datos,
issue trackers, docs, browsers. Desde el harness MCP es guía (determina qué
*ve y hace* el agente) y superficie de riesgo (servidores corren con tus
credenciales — nunca secrets inline; usa interpolación `${ENV_VAR}`).

## Subagents — delegados con propósito {#subagents-purpose-built-delegates}

Un subagent es archivo markdown en `.cursor/agents/` (o carpeta `agents/` de
plugin) con el mismo contrato de frontmatter `name` + `description` que una skill:

```markdown
---
name: reviewer
description: Use when asked to review a pull request or diff for conventions
  in AGENTS.md and .cursor/rules; reports findings by severity without
  editing code.
---

# Reviewer subagent

Read the diff, AGENTS.md, and .cursor/rules/*.mdc. Report violations ordered
by severity. Never modify code — that's the parent agent's job.
```

Distinción de skill: una skill enseña al agente *primario* un procedimiento que
corre inline; un subagent es **delegado separado** al que el agente primario pasa
tarea — a menudo con acceso a herramientas más estrecho o job description menor,
para que tarea grande (auditoría de repo, release multi-step) se divida entre
workers especializados en lugar de un agente hacer todo en un contexto. La
documentación de Cursor describe esto como delegar trabajo "purpose-built" —
planner, reviewer, release runner — cada uno con description lo bastante
ajustada para que el agente primario decida cuándo delegar sin adivinar.

Misma regla que skills en la description: es la única señal que el agente primario
usa para decidir delegar — escríbela como condición de disparo, no etiqueta.

## Plugins — el harness, empaquetado

Un plugin Cursor empaqueta rules, skills, commands, hooks, agents y config MCP
en una unidad instalable con manifest `.cursor-plugin/plugin.json`, distribuido
por el [Cursor Marketplace](https://cursor.com/marketplace). Los plugins importan
para ingeniería de harness porque hacen patrones de harness **reutilizables entre
repos** — incluido el
[plugin Harness Score](./measure-and-improve#the-cursor-plugin) que audita los
artefactos que este capítulo describió (instalable desde el directorio del repo
hoy; listado Marketplace pendiente de revisión).

## Elegir el mecanismo correcto

| Quieres… | Usa |
|---|---|
| Declarar convención que siempre vale | Rule (`alwaysApply`) — con moderación |
| Declarar convención para parte del codebase | Rule con `globs` |
| Enseñar procedimiento multi-step | Skill |
| Empaquetar workflow que humanos disparan | Command |
| Delegar trabajo a worker separado con propósito | Subagent |
| Imponer algo independiente de lo que piensa el modelo | Hook |
| Dar herramienta o fuente de datos al agente | Servidor MCP |
| Compartir todo lo anterior entre repos | Plugin |

Si una guía sigue ignorándose, muévela *hacia abajo* en esta tabla — de prosa que
el modelo puede saltar, hacia mecanismos que el runtime impone.
