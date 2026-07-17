# Guías — controles feedforward

Las guías moldean lo que el agente hace *antes* de actuar. Son los controles
más baratos que tienes: un párrafo en el lugar correcto evita categorías enteras
de errores. Este capítulo cubre cómo escribirlas bien.

## La economía del contexto

Cada guía compite por el mismo recurso escaso: la ventana de contexto y la
atención del modelo. El modo de fallo de equipos entusiastas no es pocas guías,
sino **demasiadas palabras** — un archivo de rules de 2.000 líneas que el modelo
solo pasa de largo, una wiki pegada en `AGENTS.md`. La lección de harness de
LangChain aplica aquí: *ensamblar contexto en nombre del agente* significa dar
las 50 líneas correctas, no las 5.000.

Presupuesto práctico:

- `AGENTS.md`: ≤150 líneas, siempre cargado — solo lo que aplica a *toda* tarea.
- Rules always-on: una o dos, ≤30 líneas cada una.
- Rules con alcance por glob: las que necesites; cada una carga solo cuando aplica.
- Skills: longitud ilimitada; cargadas solo bajo demanda.

## Escribiendo un AGENTS.md que funciona

Estructura que se ha probado:

```markdown
# Agent Guide — <project>

## What this is
Two sentences. Domain, purpose, key constraint.

## Layout
- src/api — HTTP layer (see .cursor/rules/api.mdc)
- src/core — domain logic, pure functions only
- migrations/ — generated; never edit by hand

## Build & test
- npm run dev / npm test / npm run typecheck
- Tests MUST pass before any commit.

## Conventions
- TypeScript strict; no `any` without a comment.
- Never add dependencies without asking.

## Do not touch
- vendor/, generated/, legacy/payments (frozen for audit)
```

Principios:

1. **Comandos, no descripciones.** "Corre `npm test`" gana a "valoramos los tests".
   Los agentes actúan con imperativos.
2. **Apunta, no pegues.** Enlaza a la rule o skill con alcance en lugar de pegar
   detalles ("ver `.cursor/rules/api.mdc`").
3. **Di lo que no hacer.** Espacio negativo — directorios congelados, patrones
   prohibidos — evita los errores más caros.
4. **Mantén actualizado.** Guía obsoleta es peor que ninguna; el agente la sigue
   con confianza. Revisar `AGENTS.md` entra en tu definición de hecho para cambios
   arquitectónicos.

## Escribiendo rules que disparan correctamente

Una rule tiene tres trabajos: aplicar en el momento correcto, ser lo bastante
corta para leerse, y lo bastante concreta para verificarse.

**Alcance agresivo.** El mayor anti-patrón de rules es `alwaysApply: true` en
todo. Cada rule always-on carga en cada request — incluso para corregir un typo
en el README. Alcance por glob:

```markdown
---
description: React component conventions
globs: src/components/**/*.tsx
---
```

**Una preocupación por rule.** `api.mdc`, `testing.mdc`, `styling.mdc` — no
`everything.mdc`. Rules pequeñas son diffables, revisables y escopables
independientemente.

**Concreta y verificable.** "Escribe buenos tests" no orienta nada. "Cada nuevo
export en `src/core` necesita test unitario en la carpeta `__tests__` hermana"
orienta — y un revisor (o sensor) puede verificar.

**Muestra, luego di.** Un ejemplo de código de 5 líneas del patrón correcto gana
a tres párrafos describiéndolo.

## Skills: la capa procedural

Todo lo que parece *runbook* pertenece a una skill, no a una rule:

- Procedimientos de deploy y release
- Workflows de migración de base de datos
- "Cómo agregar un endpoint de API de punta a punta"
- Playbooks de debug de incidentes

La calidad de la skill depende de la **description**, porque es todo lo que el
agente ve al decidir cargarla. Compara:

```yaml
description: Deployment stuff            # never triggers
```

```yaml
description: Use when the user asks to deploy, release, or ship to
  production; covers tagging, the pipeline, rollback, and smoke tests.
```

Escribe descriptions como condiciones de disparo ("Use when…"), ≥40 caracteres,
con las palabras que un usuario diría de verdad.

## Commands: codifica los verbos del equipo

Los commands son guías para *humanos y agentes a la vez*: `/review`, `/release`,
`/new-endpoint` documentan cómo trabaja el equipo de forma ejecutable. Un buen
prompt de command declara el workflow, la barra de calidad y la condición de
parada:

```markdown
# /review

Review the current diff against AGENTS.md and .cursor/rules/.
Report findings ordered by severity with file:line references.
Do not fix anything unless explicitly asked.
```

## Scripts bootstrap y templates

Fowler lista herramientas bootstrap entre controles feedforward: generadores y
templates que inician al agente desde un esqueleto conocido-bueno (`npm run
new:endpoint`, template de servicio con observabilidad). Cuando un patrón debe
repetirse exactamente, un generador gana a una descripción del patrón —
determinismo otra vez. Menciona esos scripts en `AGENTS.md` para que los agentes
los usen en lugar de inventar desde cero.

## Cómo fallan las guías, y qué las atrapa

| Falla | Síntoma | Contramedida |
|---|---|---|
| Guía obsoleta | Agente sigue convención desactualizada | Revisar archivos de harness en PRs que tocan arquitectura |
| Contexto hinchado | Agente ignora instrucciones a mitad de archivo | Escopar rules; mover procedimientos a skills |
| Orientación vaga | Agente interpreta creativamente | Hacer rules concretas y verificables |
| Guía ignorada | Mismo error se repite | Escalar a sensor o hook (capítulos 4–5) |

La última fila es el puente al siguiente capítulo: las guías son sugerencias, y
algunas sugerencias deben volverse **checks**.
