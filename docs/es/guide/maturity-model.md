# El modelo de madurez

Este capítulo define el modelo de madurez — el mismo marco de evaluación
implementado por [`npx harness-score`](./measure-and-improve),
para que un nivel que lees aquí sea uno que puedes medir, reproducir y exigir
en CI.

La forma sigue patrones familiares de madurez (capacidades DORA, funciones de
negocio OWASP SAMM, niveles CMMI): **dimensiones** miden áreas de práctica,
**checks** son indicadores deterministas pass/fail, y **niveles** exigen la
*forma* de la cobertura — no solo un porcentaje bruto.

Objetivos de diseño:

- **Determinista.** Cada check es un hecho del filesystem: un archivo existe,
  parsea, coincide con un patrón. Sin modelo, sin juicio, sin red.
- **Agnóstico de herramienta, Cursor como ejemplo principal.** Rules, skills,
  hooks y commands de cualquier herramienta de IA soportada (Cursor, Windsurf,
  Claude Code, Codex/Antigravity `.agents/`, OpenCode, Cline, Continue,
  instrucciones Copilot, Zed) puntúan con semántica OR — basta una herramienta
  configurada. Infraestructura universal (tests, linters, tipos, CI) forma el
  mismo sistema de control sin importar el IDE.
- **Una escalera, no una calificación.** Los niveles exigen la *forma* del
  harness (qué dimensiones están cubiertas), no solo puntos — 80 puntos de guías
  con cero sensores no es madurez.

## Las seis dimensiones

108 puntos en seis dimensiones:

| Dimensión | Puntos | Qué mide |
|---|---|---|
| Context & Guides | 20 | AGENTS.md, calidad y alcance de rules |
| Skills & Commands | 17 | Conocimiento procedural, workflows explícitos, subagents |
| Hooks & Guardrails | 14 | Gates y feedback enforced en runtime |
| Sensors & Feedback | 20 | Tests, linter, tipos, formatter |
| CI Feedback | 14 | Checks de pipeline, pre-commit |
| Hygiene & Safety | 23 | Secretos, env files, lockfile, licencia, config MCP |

Cada dimensión es la suma de checks individuales (catálogo completo con
remediaciones en el [capítulo 7](./measure-and-improve#the-check-catalog)).

## Los cinco niveles

### L0 · Sin harness

El repo no le da nada al agente: sin archivo de contexto, sin rules, sin checks
enforced. Los agentes trabajan aquí — siempre lo hacen — pero cada sesión
redescubre el proyecto desde cero y cada error sale a menos que un humano lo
atrape. La mayoría de repos empiezan aquí.

### L1 · Documentado

**Requiere: Context & Guides ≥ 40%.**

Hay un `AGENTS.md` (o equivalente) sustancial: qué es el proyecto, cómo
construir y probar, qué convenciones valen. El paso de mayor palanca desde
cero — feedforward para toda sesión futura en un archivo.

### L2 · Guiado

**Requiere: Context ≥ 60% · (Skills ≥ 30% o Hooks ≥ 30%) · Hygiene ≥ 50%.**

La orientación tiene estructura: rules con alcance y frontmatter válido
(`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/` o equivalente de tu
herramienta), y al menos el inicio de conocimiento procedural (skill,
command/workflow o subagent) o maquinaria de hooks. Higiene básica sólida —
env ignorados, sin firmas de credencial en archivos de harness. El harness ahora
viaja con el código y se revisa como código.

### L3 · Con sensores

**Requiere L2, más: Sensors ≥ 60% · CI ≥ 50%.**

Existe el bucle de feedback. Tests que el agente puede correr, linter, type
checking y pipeline CI que reverifica cada push. Es el nivel donde empieza la
autocorrección: el agente puede *verificar su propio trabajo* con herramientas
deterministas, y el pipeline atrapa lo que pierde. Para la mayoría de equipos,
L3 es donde el desarrollo asistido por IA deja de sentirse arriesgado.

### L4 · Autocorrección

**Requiere L3, más: Hooks ≥ 70% · puntuación total ≥ 80%.**

El bucle cierra en runtime. Gate hooks hacen imposibles las acciones destructivas
en lugar de desalentarlas; feedback hooks lintan y formatean en cada edición,
dentro de la sesión. Guías, sensores y guardrails cubren las seis dimensiones.
Un error ahora debe pasar rules, hooks on-edit, tests, type checker, CI *y*
gates — en gran parte sin humano en el loop.

## Leyendo una puntuación

Dos repos pueden tener 65% con formas muy distintas — por eso los niveles exigen
dimensiones:

- **65%, todo guías, cero sensores** → L1. Bellamente documentado, no verificado.
  Prioridad: tests + CI, no más prosa.
- **65%, sensores fuertes, sin contexto** → L0/L1. El trabajo del agente se
  verifica, pero adivina tus convenciones cada sesión. Prioridad: una tarde en
  `AGENTS.md` y tres rules con alcance.

El escáner imprime exactamente qué requisito bloquea el siguiente nivel
(`To reach L3: sensors ≥ 60%; ci ≥ 50%`), así que el camino de mejora nunca
es ambiguo.

## Qué el modelo deliberadamente no mide

Honestidad sobre los límites del determinismo (el caveat de Fowler de que
"behavior harness is immature" aplica también a la medición):

- **Si tus tests son buenos** — solo que existen, corren y gatean.
- **Si tus rules son verdaderas** — una rule obsoleta puntúa como una fresca.
- **Corrección funcional** — ningún scan estático verifica comportamiento.
- **Práctica de equipo** — branch protection, cultura de review y workflows de
  agente viven fuera del árbol del repo.

Puntuación alta significa que la *infraestructura* para trabajo confiable con
agente existe. Es necesaria, no suficiente — el techo de lo que un escáner
determinista puede afirmar con honestidad.

## Usando la escalera

1. Ejecuta `npx harness-score` — obtén tu nivel y los gaps exactos.
2. Sube un nivel a la vez; los requisitos de cada nivel son un esfuerzo enfocado
   (L1: escribir AGENTS.md → L2: rules + higiene → L3: sensores + CI →
   L4: hooks).
3. Exige el nivel en CI (`--min-level`) para que la madurez solo suba.
4. Muéstralo — badge en README (`harness` · `L4`) y [share card](./measure-and-improve#show-your-maturity) opcional. Misma píldora del CI (`--badge`) o archivo estático fijo.

El capítulo 7 recorre cada paso, check a check.
