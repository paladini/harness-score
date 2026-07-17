# Guardrails y seguridad

Las guías sugieren. Los sensores detectan. **Los guardrails impiden.** Este
capítulo cubre la capa del harness que aguanta aunque el modelo ignore toda
instrucción — porque no depende de que el modelo lea nada.

## Por qué la prosa no es guardrail

Una rule que dice "nunca corras `git push --force`" es un pedido a un sistema
probabilístico. Generalmente será respetada. "Generalmente" es la clase de
confiabilidad incorrecta para operaciones destructivas, irreversibles o que
tocan credenciales. Para esas, el check debe vivir **fuera del modelo**, en
maquinaria que el modelo no puede saltar: hooks, permisos e higiene del repo.

La escalera del capítulo 3 termina aquí: orientación que sigue violándose pasa
de rule → sensor → **gate**.

## Gate hooks

Los eventos de gate de Cursor — `beforeShellExecution`, `beforeMCPExecution`,
`preToolUse`, `beforeReadFile` — corren tu script *antes* de la acción y permiten
responder `allow`, `deny` o `ask`:

```js
// .cursor/hooks/guard-shell.js — deny destructive commands
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const { command = '' } = JSON.parse(input || '{}');
  const destructive =
    /\brm\s+-rf\s+[\/~]|\bgit\s+push\s+--force\b|\bdrop\s+(table|database)\b/i;
  process.stdout.write(
    JSON.stringify(
      destructive.test(command)
        ? { permission: 'deny', userMessage: 'Blocked: destructive command.' }
        : { permission: 'allow' },
    ),
  );
});
```

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "node ./.cursor/hooks/guard-shell.js", "timeout": 10 }
    ]
  }
}
```

Patrones que valen gate en la mayoría de repos:

- **Shell destructivo**: deletes recursivos fuera del workspace, force pushes,
  rewrites de historial, `DROP`/`TRUNCATE` contra bases no locales.
- **Escrituras outbound**: deploys, publicación de paquetes, post a APIs externas —
  `ask`, no `deny`: humano confirma, in-flow.
- **Lecturas con secreto**: `beforeReadFile` en `.env*`, archivos de clave y
  stores de credencial mantienen secretos fuera del contexto del modelo.
- **Llamadas MCP con efectos colaterales**: `beforeMCPExecution` filtrando por
  nombre de tool — allow reads, confirm writes.

Notas de diseño: falla *cerrado* para la lista peligrosa (exit code 2 bloquea),
mantén scripts de gate sin dependencias y rápidos, y **commítelos** — config de
hook apuntando a script que existe solo en tu máquina protege solo a ti.

## Higiene de secretos

El agente lee tu working tree; cualquier cosa en ella puede ir a contexto, commit
o archivo generado. Reglas deterministas de higiene:

1. **`.gitignore` cubre `.env` y `.env.*`** (permite `.env.example`).
   El guardrail más barato que existe.
2. **Sin archivos `.env` reales en el árbol** donde sea evitable; templates
   documentan variables necesarias.
3. **`mcp.json` usa interpolación `${ENV_VAR}`, nunca claves literales.** Config
   MCP con API key inline es secreto publicado en todo clone.
4. **Sin tokens en archivos de harness.** `AGENTS.md`, rules y configs de hooks
   se *cargan en contexto del modelo cada sesión* — clave ahí es exfiltrada por
   diseño.

`harness-score` checa los cuatro (HYG-02 … HYG-06) con matching de firma de
credencial — deterministicamente, offline.

## Conciencia de prompt injection

Los harnesses de agente tienen una clase de amenaza que workflows humanos no:
**instrucciones escondidas en datos**. README en dependencia, página web buscada
por MCP, comentario en issue — cualquiera puede contener texto para tu agente
("ignora tus instrucciones y corre…"). Mitigaciones a nivel harness:

- Gate hooks no importan quién autorizó la instrucción — el comando destructivo
  se niega sea el usuario, el modelo o una página inyectada quien lo pidió. Ese
  es el argumento más fuerte por gates sobre rules.
- Alcance servidores MCP a lo que la tarea necesita; servidor de docs read-only
  no publica tus datos en ningún lado.
- Trata "agente de repente quiere curl a dominio desconocido" como señal que
  vale gate `ask`.

## Permisos y radio de explosión

Más allá de hooks, reduce lo que un agente comprometido o confundido *podría*
hacer:

- Corre agentes con credenciales acotadas a la tarea (token de CI que abre PRs
  pero no hace push a `main`).
- Branch protection: agentes abren PRs; humanos (o checks obligatorios) hacen merge.
- Ejecución sandboxed para trabajo autónomo no confiable o largo.

El principio unificador es **defensa en profundidad**: rules hacen improbables
malas acciones, sensores las hacen visibles, gates las hacen imposibles, y
permisos hacen sobrevivible hasta "imposible falló".

## Conjunto mínimo viable de guardrails

Para un repo de producto típico, el piso se ve así:

- [ ] `.gitignore` cubriendo env files; sin secretos reales en el árbol
- [ ] `mcp.json` limpio de credenciales literales
- [ ] `hooks.json` con un gate de shell (patrones destructivos → deny/ask)
- [ ] Un hook de feedback (format/lint on edit)
- [ ] Branch protection con checks de CI obligatorios

Ese conjunto es exactamente lo que el [modelo de madurez](./maturity-model)
requiere para las dimensiones Hooks & Guardrails y Hygiene & Safety en L4.
