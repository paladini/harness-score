# Qué es la ingeniería de harness

> Un agente es un modelo más un harness. El modelo lo alquilas; el harness lo posees.

Cuando un agente de código con IA trabaja en tu repositorio, solo parte de su
comportamiento viene del modelo. El resto viene de todo lo que *rodea* al
modelo: las instrucciones que carga, las herramientas que puede invocar, las
verificaciones que corren sobre su salida, los gates que evitan acciones
destructivas. Esa maquinaria circundante es el **harness**, y construirla de
forma deliberada es **ingeniería de harness**.

El término cristalizó a principios de 2026. El sitio de Martin Fowler publicó
[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
(basado en un
[memo](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)
anterior), enmarcando la disciplina para equipos que *usan* agentes. Por la
misma época, LangChain mostró el otro lado: mejorando solo el harness de su
agente de código — sin tocar el modelo — pasó de **52,8% a 66,5%** en Terminal
Bench 2.0, de fuera del top 30 al top 5
([Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)).

La idea central de ambos: **la confiabilidad es propiedad del sistema
modelo–harness–entorno, no de los pesos del modelo**. Un repo bien preparado
hace útil un modelo mediocre; un repo sin harness hace peligroso un modelo
frontier.

## Guías y sensores

El marco de Fowler divide los controles del harness en dos familias,
tomadas de la teoría de control:

| | **Guías** (feedforward) | **Sensores** (feedback) |
|---|---|---|
| Cuándo | *Antes* de que el agente actúe | *Después* de que el agente actúe |
| Propósito | Orientar hacia buenos resultados | Detectar y corregir los malos |
| Ejemplos (agnósticos de herramienta) | `AGENTS.md`, rules, skills, commands, contexto MCP | tests, linters, type checkers, CI, hooks |
| Modo de fallo si falta | El agente adivina tus convenciones | El agente entrega errores con confianza |

Los principios son los mismos en Cursor, Claude Code, Windsurf y cualquier otra
herramienta de código con IA — lo que cambia es *dónde* configuras (directorios
y formatos de frontmatter distintos), no *qué* estás construyendo. Harness
Score reconoce esas variantes por **equivalencia entre herramientas** (semántica OR): basta una herramienta bien configurada para que el harness funcione
en cualquier lugar.

Un harness necesita ambos. Guías sin sensores producen salida confiada y no
verificada. Sensores sin guías atrapan los mismos errores una y otra vez porque
el agente nunca fue instruido para evitarlos.

## Verificaciones computacionales vs. inferenciales

Fowler traza una segunda distinción que esta guía — y el escáner
`harness-score` — toma en serio:

- **Verificaciones computacionales** son deterministas: linters, type checkers,
  tests, análisis estructural. Corren en milisegundos a segundos, no cuestan
  nada y dan la misma respuesta siempre. Pertenecen *en todas partes*: hooks,
  pre-commit, CI.
- **Verificaciones inferenciales** usan un modelo: code review con IA,
  LLM-as-judge, auditorías semánticas. Son potentes pero lentas, costosas y
  probabilísticas. Úsalas donde importa la semántica y la computación no alcanza.

El principio estratégico es **"mantener la calidad a la izquierda"**: empuja las
verificaciones rápidas, baratas y deterministas lo más temprano posible en el
ciclo, y reserva el juicio inferencial para lo que quede. Por eso
`harness-score` en sí es 100% computacional — una medición de madurez que no
puedes reproducir no es medición.

## Qué compra el harness: lecciones de LangChain

La subida de LangChain en Terminal Bench es el mejor caso público de ingeniería
de harness como práctica empírica. Las técnicas que movieron la aguja:

1. **Bucles de autoverificación.** El agente debe planear → implementar →
   probar → corregir antes de declarar victoria; un middleware de checklist
   pre-cierre rechaza "listo" sin paso de verificación. En tu repo, el
   equivalente es tener tests que el agente pueda correr — y convenciones que
   digan que debe hacerlo.
2. **Ensamblado de contexto en nombre del agente.** Su middleware mapea el
   directorio de trabajo al inicio de la sesión para que el agente no gaste
   pasos explorando. En Cursor, `AGENTS.md` y rules con alcance hacen ese
   trabajo.
3. **Detección de bucles.** Middleware interrumpe "doom loops" donde el agente
   repite la misma edición fallida. Los hooks dan el mismo punto de observación.
4. **Presupuesto de razonamiento en forma de sándwich.** Máximo pensamiento en
   planificación y verificación final, moderado en el medio. No controlas los
   modelos de Cursor, pero sí qué contrastan el plan y la verificación *contra*:
   tus rules y tus tests.

Las cuatro son propiedades del harness, no del modelo. Las cuatro tienen
equivalentes directos en un repo Cursor — de eso trata el resto de esta guía.

## Harnessability: algunos codebases son más fáciles de preparar

Fowler destaca **affordances ambientales** — propiedades del entorno que hacen
a los agentes más gobernables:

- **Lenguajes tipados** dan a cada edición un sensor gratis e instantáneo (el
  compilador).
- **Límites de módulo claros** reducen el contexto que el agente necesita por
  tarea.
- **Convenciones consistentes** convierten guías en listas concretas.
- **Suites de test rápidas** hacen barata la autoverificación.

Por eso el [modelo de madurez](./maturity-model) puntúa type checking e
infraestructura de tests junto con artefactos específicos de Cursor: forman
parte del mismo sistema de control.

## Hacia dónde va esta guía

- El capítulo 2 mapea la [superficie de harness de Cursor](./cursor-harness-surface) —
  cada archivo y mecanismo que ofrece Cursor.
- Los capítulos 3–5 cubren las tres familias de control en profundidad:
  [Guías](./guides-feedforward), [Sensores](./sensors-feedback) y
  [Guardrails](./guardrails-and-safety).
- El capítulo 6 define un [modelo de madurez de cinco niveles](./maturity-model)
  con criterios objetivos.
- El capítulo 7 muestra cómo [medir y mejorar](./measure-and-improve)
  con el escáner `harness-score` y el plugin Cursor.
