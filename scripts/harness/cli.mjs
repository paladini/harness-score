import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isolatedEnv, paths, ROOT, readJson, run, runtimeHealth, VERSION } from './common.mjs';
import { disable, globalSnapshot, setup } from './setup.mjs';
import { verify } from './verify.mjs';

async function main() {
  const [action = 'status', ...args] = process.argv.slice(2);
  if (action === 'setup') return setup(ROOT);
  if (action === 'disable') return disable(ROOT);
  if (action === 'verify') return verify(ROOT, args[0] ?? 'full', { fresh: args.includes('--fresh') });
  const p = paths(ROOT);
  if (action === 'status') {
    const enabled = existsSync(p.enabled);
    const problem = runtimeHealth(ROOT);
    const isolation = readJson(join(p.cache, 'isolation.json'));
    const globalsUnchanged = isolation
      ? JSON.stringify(isolation.before) === JSON.stringify(globalSnapshot())
      : null;
    console.log(
      JSON.stringify(
        {
          version: VERSION,
          enabled,
          runtime: p.runtime,
          problem,
          globalsUnchanged,
          promotion: 'pilot: real editor acceptance required',
          evidence: p.evidence,
        },
        null,
        2,
      ),
    );
    if (enabled && (problem || globalsUnchanged === false)) process.exitCode = 1;
    return;
  }
  if (action === 'toolkit') {
    const problem = runtimeHealth(ROOT);
    if (problem) throw new Error(problem);
    const result = run(ROOT, process.execPath, [join(p.runtime, 'bin', 'tlc.mjs'), 'harness', ...args], {
      env: isolatedEnv(ROOT),
    });
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    return;
  }
  throw new Error(
    'Use setup | disable | status | verify [lint|test|docs|commit|prepush|full|ready] [--fresh] | toolkit <command>',
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
