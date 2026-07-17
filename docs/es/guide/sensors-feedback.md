# Sensores — controles de feedback

Los sensores verifican lo que hizo el agente. Cierran el bucle que hace posible
la autocorrección: un agente con buenos sensores corrige sus propios errores
antes de que los veas; uno sin sensores los entrega con un resumen confiado.

## La pila de sensores

Ordena por velocidad y costo, lo más rápido primero — ese orden *es* el
principio "mantener la calidad a la izquierda":

| Sensor | Latencia | Corre en |
|---|---|---|
| Type checker | ms–s | En edición (hook), pre-commit, CI |
| Linter / formatter | ms–s | En edición (hook), pre-commit, CI |
| Tests unitarios | s | Invocado por agente, pre-commit, CI |
| Tests de integración/E2E | min | CI |
| Checks de fitness arquitectónico | s–min | CI |
| Code review con IA (inferencial) | min, $ | PR |
| Review humano | horas | PR |

El objetivo no es correr todo en todas partes; es que cada error lo atrape el
**sensor más barato capaz de detectarlo**, lo más **temprano** posible. Reserva
las dos últimas filas para lo que nada arriba puede ver.

## Type checking: el sensor gratis

Un type checker estricto es el sensor de mayor valor para trabajo con agente
porque corre en cada edición sin costo marginal, es totalmente determinista, y
sus mensajes de error son lo bastante precisos para que el agente actúe solo.

- TypeScript: `"strict": true` — TS no estricto renuncia silenciosamente a la
  mayor parte del valor.
- Python: mypy o pyright, en CI, no solo en el IDE.
- Go, Rust, Java, C#: el compilador ya hace esto; asegura que el agente compile
  antes de declarar listo.

Esto también es argumento de estrategia de lenguaje: codebases tipados son
mediblemente más *preparables para harness* — el compilador supervisa cada
edición del agente gratis.

## Tests: el sensor que los agentes usan para autocorregirse

Para un agente, una suite de tests no es (solo) red de seguridad — es la
herramienta que usa para verificar su propio trabajo a mitad de tarea. Eso
cambia qué significa "buenos tests":

1. **Rápidos.** Una suite que el agente corre en segundos se corre tras cada
   cambio; una de 20 minutos nunca. Mantén un subconjunto rápido (`npm test`)
   aunque la suite completa sea más lenta.
2. **Ejecutable con un comando obvio**, documentado en `AGENTS.md`. Si los tests
   necesitan tres env vars y una base de datos, scriptea el setup.
3. **Deterministas.** Tests flaky enseñan a agentes (como humanos) a ignorar rojo.
4. **Comportamentales.** Tests que fijan detalles de implementación bloquean
   refactors legítimos; tests que fijan comportamiento atrapan regresiones
   reales. El patrón "approved fixtures" de Fowler — archivos golden revisados
   por humanos, checados por máquinas — funciona bien en codebases con muchos
   agentes.

Y una convención que vale poner en rule: **comportamiento nuevo llega con test,
y un test fallando nunca se borra para quedar verde.** Los agentes harán ambos
si se permite.

## Linters: codifica convenciones como código

Cada convención que expresas como regla de lint es una que quitas de tus
archivos de rules — el linter la aplica deterministicamente, con mejor bucle de
feedback que prosa. Stacks modernos hacen rules custom baratas (ESLint flat
config, Biome, Ruff, custom linters golangci-lint).

Prioridad para trabajo con agente:

- Rules que atrapan *deslices semánticos* (vars sin usar, promises flotantes,
  errores no manejados) sobre estilo puro.
- Rules auto-fixables — empareja con formatter para diffs solo con señal.
- Rules custom para el "el agente insiste en hacer X" recurrente del proyecto.

## Fitness arquitectónico: sensores de estructura

La segunda dimensión de regulación de Fowler es fitness arquitectónico —
sensores que verifican estructura, no solo sintaxis:

- **Reglas de dependencia**: "core nunca importa de api" — ArchUnit (JVM),
  dependency-cruiser (JS/TS), import-linter (Python).
- **Límites de módulo** en monorepos: checks de boundary Nx/Turborepo.
- **Presupuestos de performance**: límites de bundle, conteo de queries,
  aserciones p95.

Esto importa *más* con agentes que sin ellos: un agente optimizando tarea local
viola de buena gana una restricción global que ningún archivo local menciona.
Los fitness checks hacen la restricción global local e inmediata.

## Hooks como sensores on-edit

Los hooks de Cursor mueven sensores de "cuando el agente recuerde" a "siempre":

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": "node ./.cursor/hooks/format-on-edit.js", "timeout": 30 }
    ]
  }
}
```

Buenos ciudadanos de `afterFileEdit`: formatear el archivo, correr linter en él,
correr type checker en su paquete — y devolver fallos para que el agente corrija
*ahora*, in context, en lugar de en CI una hora después. Manténlos rápidos
(sub-segundo donde sea posible); hook lento taxa cada edición.

## CI: el sensor de registro

Sensores locales son consultivos — nada obliga al agente (o al humano que mergea
su trabajo) a haberlos corrido. CI es donde sensores se vuelven **hechos**:

- Corre tests, lint y typecheck en cada push y PR.
- Hazlos checks obligatorios; PR con CI rojo del agente es trabajo no revisado,
  no borrador.
- Agrega `harness-score --min-level N` como job para frenar *regresión* de
  harness — falla de drift de config donde alguien borra hooks.json y nadie
  nota ([detalles en capítulo 7](./measure-and-improve#ci-gate)).

Herramientas pre-commit (husky + lint-staged, `pre-commit`, lefthook) llenan el
hueco entre hooks on-edit y CI: último check determinista antes de que exista
el commit.

## Sensores inferenciales: IA revisando IA

Review basado en LLM (Bugbot de Cursor, agentes juez, plugins de review) paga
su costo en lo que la computación no checa: ¿este cambio *significa* lo correcto?
¿Esta abstracción tiene sentido? Dos reglas mantienen honestidad:

1. Complementa la pila computacional, nunca la sustituye. Reviewer de IA
   aprobando código que no compila es teatro.
2. Sus hallazgos deben ser *spot-checkable* — prefiere reviewers que citan
   file:line y describen escenario de fallo sobre los que emiten vibes.

## El bucle de autocorrección, armado

Con la pila en su lugar, el bucle que LangChain diseñó explícitamente emerge
naturalmente: agente edita → hooks formatean y lintan → corre tests rápidos →
CI reverifica todo → reviewer inferencial lee sobrevivientes. Cada capa atrapa
lo que la anterior perdió, y cada captura ocurre en el punto más barato posible.
Lo que aún falta es hacer imposibles las acciones peligrosas en lugar de
detectables — eso es [Guardrails](./guardrails-and-safety).
