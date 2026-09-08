import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isolatedEnv, paths, ROOT, runtimeHealth } from './common.mjs';
import { assertReady } from './verify.mjs';

export function deliveryCommand(command) {
  // This is a delivery-state gate, not a shell sandbox. Quoted prose is kept as
  // one token so commands such as `echo "gh pr create"` do not trigger it.
  const words = [];
  let word = '';
  let quote = '';
  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (quote) {
      if (character === quote) quote = '';
      else word += character;
    } else if (character === '"' || character === "'") quote = character;
    else if (/\s|[;&|()]/.test(character)) {
      if (word) words.push(word.toLowerCase());
      word = '';
    } else if (character === '\\' && index + 1 < command.length) word += command[++index];
    else word += character;
  }
  if (word) words.push(word.toLowerCase());
  return words.some(
    (token, index) =>
      token === 'gh' && words[index + 1] === 'pr' && ['create', 'ready'].includes(words[index + 2]),
  );
}
export function denial(provider, handler, reason) {
  if (provider === 'claude')
    return handler === 'stop'
      ? { decision: 'block', reason }
      : {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
          },
        };
  return handler === 'stop' ? { followup_message: reason } : { permission: 'deny', user_message: reason };
}
export function dispatch(
  root,
  provider,
  handler,
  payload,
  { execute = spawnSync, health = runtimeHealth } = {},
) {
  if (!['cursor', 'claude'].includes(provider)) throw new Error('Unknown provider');
  if (!existsSync(paths(root).enabled)) return {};
  const problem = health(root);
  if (problem) {
    console.error(`HARNESS DEGRADED: ${problem}`);
    return ['tool-before', 'stop'].includes(handler) ? denial(provider, handler, problem) : {};
  }
  const command = payload.command ?? payload.tool_input?.command ?? '';
  if (handler === 'tool-before' && deliveryCommand(command)) {
    try {
      assertReady(root);
    } catch (error) {
      return denial(provider, handler, error.message);
    }
  }
  const p = paths(root);
  const result = execute(process.execPath, [join(p.runtime, 'bin', 'tlc-exec.mjs'), handler], {
    cwd: root,
    env: isolatedEnv(root),
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 850_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    const reason = `HARNESS DEGRADED: ${handler} failed (${result.status ?? result.error?.code})`;
    console.error(reason);
    return ['tool-before', 'stop'].includes(handler) ? denial(provider, handler, reason) : {};
  }
  return result.stdout?.trim() ? JSON.parse(result.stdout) : {};
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/harness/hook.mjs')) {
  const [, , provider, handler] = process.argv;
  try {
    process.stdout.write(
      JSON.stringify(dispatch(ROOT, provider, handler, JSON.parse(readFileSync(0, 'utf8') || '{}'))),
    );
  } catch (error) {
    console.error(error.message);
    process.stdout.write(JSON.stringify(denial(provider, handler, error.message)));
  }
}
