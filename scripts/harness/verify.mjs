import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {
  git,
  identity,
  paths,
  ROOT,
  readJson,
  run,
  runtimeHealth,
  TIMEOUT,
  VERSION,
  writeJson,
} from './common.mjs';

export const FULL = [
  ['npm', ['test']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'test:coverage']],
  ['npm', ['run', 'typecheck:consumer', '-w', 'harness-score']],
  ['npm', ['run', 'check:types', '-w', 'harness-score']],
  ['npm', ['run', 'docs:build']],
  ['npm', ['run', 'plugins:sync-check']],
  ['node', ['packages/cli/dist/cli.js', '.', '--min-level', '4']],
];
export function fullCommands(root) {
  const commands = FULL.map(([command, args]) => [command, [...args]]);
  if (existsSync(paths(root).enabled)) {
    commands.splice(1, 0, ['npm', ['run', 'test:harness:integration']]);
  }
  return commands;
}
export function changedFiles(root) {
  return [
    ...new Set(
      [
        ...git(root, ['diff', '--name-only', 'HEAD', '-z']).split('\0'),
        ...git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
      ].filter(Boolean),
    ),
  ];
}
export function documentationCommands(files) {
  const commands = [];
  if (files.some((f) => /^(docs\/|.*\.md$|package(-lock)?\.json$)/.test(f)))
    commands.push(['npm', ['run', 'docs:build']]);
  if (files.some((f) => /^(plugins\/|package(-lock)?\.json$)/.test(f)))
    commands.push(['npm', ['run', 'plugins:sync-check']]);
  if (files.some((f) => /(^[^/]+\.(json|jsonc)$|^\.github\/|^\.husky\/)/.test(f)))
    commands.push(['npm', ['test']], ['npm', ['run', 'lint']]);
  return commands;
}
export function commandsFor(phase, files = [], root = ROOT) {
  if (phase === 'full' || phase === 'prepush') return fullCommands(root);
  if (phase === 'test' || phase === 'commit') return [['npm', ['test']]];
  if (phase === 'lint') return [['npm', ['run', 'lint']]];
  if (phase === 'docs') return documentationCommands(files);
  throw new Error(`Unknown verification phase: ${phase}`);
}
export function evidenceValid(evidence, current, commands) {
  return (
    evidence?.status === 'pass' &&
    evidence?.toolkit === VERSION &&
    isDeepStrictEqual(evidence.identity, current) &&
    isDeepStrictEqual(evidence.commands, commands) &&
    evidence.results?.length === commands.length &&
    evidence.results.every((r) => r.exitCode === 0)
  );
}
export async function withLock(root, work, waitMs = TIMEOUT) {
  const path = paths(root).lock;
  mkdirSync(paths(root).cache, { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      mkdirSync(path);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline)
        throw new Error('Verification lock is busy; no passing evidence was produced.');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  writeFileSync(join(path, 'owner.json'), JSON.stringify({ pid: process.pid }));
  try {
    return await work();
  } finally {
    rmSync(path, { recursive: true });
  }
}
export function assertClean(root) {
  if (git(root, ['status', '--porcelain']).trim())
    throw new Error(
      'Delivery requires a clean committed worktree. Commit changes, verify, then run harness-reviewer.',
    );
}
export function assertReady(root) {
  assertClean(root);
  if (existsSync(paths(root).enabled)) {
    const problem = runtimeHealth(root);
    if (problem) throw new Error(problem);
  }
  const evidence = readJson(join(paths(root).evidence, 'full.json'));
  if (!evidenceValid(evidence, identity(root), fullCommands(root)))
    throw new Error('Missing or stale full verification. Run npm run harness:verify -- full.');
}
export async function verify(root, phase, { fresh = false, execute = run } = {}) {
  if (phase === 'ready') {
    assertReady(root);
    return;
  }
  const unstaged = git(root, ['diff', '--name-only', '-z']);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (phase === 'commit' && (unstaged.length || untracked.length)) {
    throw new Error(
      'Unstaged or untracked changes exist. Tests must cover exactly the staged content; stage or separate them first.',
    );
  }
  if (phase === 'prepush' || phase === 'full') assertClean(root);
  return withLock(root, async () => {
    if (existsSync(paths(root).enabled)) {
      const problem = runtimeHealth(root);
      if (problem) throw new Error(problem);
    }
    const manifest = JSON.parse(readFileSync(join(root, 'packages/cli/package.json'), 'utf8'));
    if (
      Object.keys(manifest.dependencies ?? {}).length ||
      Object.keys(manifest.optionalDependencies ?? {}).length
    ) {
      throw new Error('The scanner must keep zero runtime dependencies.');
    }
    const before = identity(root);
    const commands = commandsFor(phase, changedFiles(root), root);
    const key = phase === 'commit' ? 'test' : phase === 'prepush' ? 'full' : phase;
    const file = join(paths(root).evidence, `${key}.json`);
    const previous = readJson(file);
    if (!fresh && evidenceValid(previous, before, commands)) {
      console.log(`harness verify ${phase}: reused content-matched PASS`);
      return previous;
    }
    const evidence = {
      status: 'running',
      toolkit: VERSION,
      identity: before,
      commands,
      results: [],
      startedAt: new Date().toISOString(),
    };
    writeJson(file, evidence);
    try {
      for (const [command, args] of commands) {
        const started = Date.now();
        console.log(`harness verify ${phase}: ${command} ${args.join(' ')}`);
        try {
          const result = execute(root, command, args);
          evidence.results.push({
            command: [command, ...args],
            exitCode: 0,
            durationMs: Date.now() - started,
          });
          const log = join(paths(root).evidence, `${key}-${evidence.results.length}.log`);
          writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`);
        } catch (error) {
          evidence.results.push({
            command: [command, ...args],
            exitCode: 1,
            durationMs: Date.now() - started,
          });
          throw error;
        }
      }
      if (!isDeepStrictEqual(before, identity(root)))
        throw new Error('Inputs changed during verification; results are stale.');
      evidence.status = 'pass';
      console.log(`harness verify ${phase}: PASS (${commands.length} commands)`);
    } catch (error) {
      evidence.status = 'fail';
      evidence.error = String(error.message);
      throw error;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      writeJson(file, evidence);
    }
    return evidence;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verify(ROOT, process.argv[2] ?? 'full', { fresh: process.argv.includes('--fresh') }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
