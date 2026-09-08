import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isolatedEnv, PACKAGE, paths, readJson, run, runtimeHealth, VERSION, writeJson } from './common.mjs';

export function globalSnapshot() {
  return Object.fromEntries(
    [
      '.cursor/hooks.json',
      '.claude/settings.json',
      '.tlc/harness/config.json',
      '.local/bin/tlc',
      '.local/bin/tlc.cmd',
    ].map((file) => {
      const path = join(homedir(), file);
      return [file, existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null];
    }),
  );
}
export function mergeHooks(existing, provider, generated) {
  const document = structuredClone(
    existing ?? (provider === 'cursor' ? { version: 1, hooks: {} } : { hooks: {} }),
  );
  document.hooks ??= {};
  for (const [event, entries] of Object.entries(document.hooks)) {
    document.hooks[event] = entries.filter(
      (entry) => !JSON.stringify(entry).includes('scripts/harness/hook.mjs'),
    );
    if (!document.hooks[event].length) delete document.hooks[event];
  }
  for (const [event, entries] of Object.entries(generated.hooks)) {
    const converted = entries.map((entry) => {
      if (provider === 'cursor') {
        const handler = entry.command.trim().split(/\s+/).at(-1);
        const failClosed = [
          'beforeShellExecution',
          'preToolUse',
          'beforeMCPExecution',
          'beforeReadFile',
        ].includes(event);
        return {
          ...entry,
          command: `node ./scripts/harness/hook.mjs cursor ${handler}`,
          timeout:
            event === 'stop' || event === 'beforeShellExecution' || event === 'preToolUse'
              ? 900
              : entry.timeout,
          ...(failClosed ? { failClosed: true } : {}),
          ...(event === 'stop' ? { loop_limit: 3 } : {}),
        };
      }
      return {
        ...entry,
        hooks: entry.hooks.map((hook) => ({
          ...hook,
          command: 'node',
          args: ['./scripts/harness/hook.mjs', 'claude', hook.args.at(-1)],
          timeout: event === 'Stop' || event === 'PreToolUse' ? 900 : 30,
        })),
      };
    });
    document.hooks[event] = [...(document.hooks[event] ?? []), ...converted];
  }
  return document;
}
export async function setup(root) {
  if (Number(process.versions.node.split('.')[0]) < 24)
    throw new Error('Toolkit setup requires Node 24+. The scanner still supports Node 18+.');
  const p = paths(root);
  const before = globalSnapshot();
  mkdirSync(p.cursor, { recursive: true });
  mkdirSync(p.claude, { recursive: true });
  run(root, 'npm', [
    'install',
    '--prefix',
    p.prefix,
    '--no-save',
    '--package-lock=false',
    '--ignore-scripts',
    `${PACKAGE}@${VERSION}`,
  ]);
  const origin = join(p.prefix, 'node_modules', '@tech-leads-club', 'harness-toolkit');
  // The delivery package must resolve itself on the first install, not a nonexistent destination.
  const env = isolatedEnv(root, { TLC_HOME: origin, TLC_ORIGIN: origin });
  mkdirSync(p.runtime, { recursive: true });
  writeJson(join(p.runtime, 'config.json'), { version: 1 });
  run(root, process.execPath, [join(origin, 'bin', 'tlc.mjs'), 'harness', 'install'], { env });
  const problem = runtimeHealth(root);
  if (problem) throw new Error(problem);
  for (const [provider, relative, generated] of [
    ['cursor', '.cursor/hooks.json', join(p.cursor, 'hooks.json')],
    ['claude', '.claude/settings.json', join(p.claude, 'settings.json')],
  ]) {
    const target = join(root, relative);
    const source = readJson(generated);
    if (!source?.hooks) throw new Error(`Installer produced no ${provider} hooks`);
    const existing = readJson(target);
    if (existsSync(target) && !existing) throw new Error(`Refusing invalid JSON: ${relative}`);
    writeJson(target, mergeHooks(existing, provider, source));
  }
  const after = globalSnapshot();
  writeJson(join(p.cache, 'isolation.json'), {
    before,
    after,
    unchanged: JSON.stringify(before) === JSON.stringify(after),
  });
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('Global configuration changed; pilot activation refused. See isolation.json.');
  writeJson(p.enabled, { version: VERSION });
  console.log(
    `Toolkit ${VERSION} enabled only in ${root}. Restart the project session; run npm run harness:status.`,
  );
}
export function disable(root) {
  for (const relative of ['.cursor/hooks.json', '.claude/settings.json']) {
    const path = join(root, relative);
    const document = readJson(path);
    if (document?.hooks)
      writeJson(
        path,
        mergeHooks(document, relative.startsWith('.cursor') ? 'cursor' : 'claude', { hooks: {} }),
      );
  }
  rmSync(paths(root).enabled, { force: true });
  console.log('Toolkit hooks removed; local guards, formatting, runtime and evidence preserved.');
}
