import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  fingerprint,
  git,
  identity,
  isolatedEnv,
  paths,
  ROOT,
  readJson,
  runtimeHealth,
  SOURCE_COMMIT,
  VERSION,
  writeJson,
} from '../common.mjs';
import { deliveryCommand, dispatch } from '../hook.mjs';
import { mergeHooks } from '../setup.mjs';
import {
  assertReady,
  documentationCommands,
  evidenceValid,
  FULL,
  fullCommands,
  verify,
  withLock,
} from '../verify.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'harness pilot space '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'packages/cli'), { recursive: true });
  writeFileSync(join(root, '.gitignore'), '.cache/\n.tlc/harness/state/\n');
  writeJson(join(root, 'packages/cli/package.json'), { name: 'fixture' });
  writeFileSync(join(root, 'input.txt'), 'first');
  git(root, ['init', '-q']);
  git(root, ['add', '.']);
  git(root, [
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-qm',
    'fixture',
  ]);
  return root;
}

test('setup merge is idempotent and preserves foreign Cursor hooks', () => {
  const existing = {
    version: 1,
    hooks: { beforeShellExecution: [{ command: 'node guard.js', timeout: 10 }] },
  };
  const generated = {
    hooks: {
      beforeShellExecution: [{ command: 'node "C:/space path/tlc-exec.mjs" tool-before', timeout: 10 }],
      stop: [{ command: 'node x stop', timeout: 120 }],
    },
  };
  const first = mergeHooks(existing, 'cursor', generated);
  assert.deepEqual(mergeHooks(first, 'cursor', generated), first);
  assert.equal(first.hooks.beforeShellExecution[0].command, 'node guard.js');
  assert.equal(first.hooks.beforeShellExecution[1].failClosed, true);
  assert.equal(first.hooks.stop[0].loop_limit, 3);
  assert.equal(JSON.stringify(first).includes('C:/space'), false);
});
test('Claude merge preserves permissions and unrelated groups', () => {
  const existing = {
    permissions: { deny: ['Bash(npm publish *)'] },
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'custom' }] }] },
  };
  const generated = {
    hooks: {
      PreToolUse: [{ hooks: [{ type: 'command', command: 'node', args: ['runtime', 'tool-before'] }] }],
    },
  };
  const first = mergeHooks(existing, 'claude', generated);
  assert.deepEqual(mergeHooks(first, 'claude', generated), first);
  assert.deepEqual(first.permissions, existing.permissions);
  assert.equal(first.hooks.PreToolUse.length, 2);
  assert.equal(mergeHooks(first, 'claude', { hooks: {} }).hooks.PreToolUse.length, 1);
});
test('Codex merge preserves foreign groups and emits portable project commands', () => {
  const existing = {
    description: 'project hooks',
    hooks: {
      PreToolUse: [{ matcher: '^Bash$', hooks: [{ type: 'command', command: 'node guard.js' }] }],
    },
  };
  const generated = {
    hooks: {
      PreToolUse: [
        {
          hooks: [
            {
              type: 'command',
              command: 'node "C:/space path/tlc-exec.mjs" --provider codex tool-before',
              timeout: 10,
            },
          ],
        },
      ],
    },
  };
  const first = mergeHooks(existing, 'codex', generated);
  assert.deepEqual(mergeHooks(first, 'codex', generated), first);
  assert.equal(first.description, existing.description);
  assert.equal(first.hooks.PreToolUse.length, 2);
  assert.match(first.hooks.PreToolUse[1].hooks[0].command, /git rev-parse --show-toplevel/);
  assert.match(first.hooks.PreToolUse[1].hooks[0].commandWindows, /powershell -NoProfile/);
  assert.equal(JSON.stringify(first).includes('C:/space'), false);
  assert.equal(mergeHooks(first, 'codex', { hooks: {} }).hooks.PreToolUse.length, 1);
});
test('Codex reviewer is project-scoped and read-only', () => {
  const reviewer = readFileSync(join(ROOT, '.codex/agents/harness-reviewer.toml'), 'utf8');
  assert.match(reviewer, /^name = "harness-reviewer"/m);
  assert.match(reviewer, /^description = /m);
  assert.match(reviewer, /^sandbox_mode = "read-only"/m);
  assert.match(reviewer, /^developer_instructions = """/m);
  assert.match(reviewer, /Never edit files/);
});
test('fingerprint changes for edits, additions and deletions', (t) => {
  const root = fixture(t);
  const start = fingerprint(root);
  writeFileSync(join(root, 'input.txt'), 'second');
  assert.notEqual(fingerprint(root), start);
  writeFileSync(join(root, 'input.txt'), 'first');
  assert.equal(fingerprint(root), start);
  writeFileSync(join(root, 'new.txt'), 'new');
  assert.notEqual(fingerprint(root), start);
  rmSync(join(root, 'new.txt'));
  rmSync(join(root, 'input.txt'));
  assert.notEqual(fingerprint(root), start);
});
test('isolated environment preserves the host PATH', () => {
  const env = isolatedEnv(ROOT);
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path');
  assert.ok(pathKey);
  assert.match(env[pathKey], /harness-toolkit/);
  assert.ok(env[pathKey].length > paths(ROOT).bin.length);
  assert.equal(env.CODEX_HOME, paths(ROOT).codex);
  assert.equal(env.COPILOT_CONFIG_DIR, paths(ROOT).copilot);
});
test('verification caches only identical inputs and invalidates new HEAD', async (t) => {
  const root = fixture(t);
  let calls = 0;
  const execute = () => {
    calls++;
    return { stdout: 'passed' };
  };
  await verify(root, 'test', { execute });
  await verify(root, 'test', { execute });
  assert.equal(calls, 1);
  git(root, [
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '--allow-empty',
    '-qm',
    'next',
  ]);
  await verify(root, 'test', { execute });
  assert.equal(calls, 2);
  writeFileSync(join(root, 'input.txt'), 'changed');
  await verify(root, 'test', { execute });
  assert.equal(calls, 3);
});
test('a failed command and an input race never produce PASS', async (t) => {
  const root = fixture(t);
  await assert.rejects(
    verify(root, 'full', {
      execute: () => {
        throw new Error('failure');
      },
    }),
    /failure/,
  );
  assert.equal(readJson(join(paths(root).evidence, 'full.json')).status, 'fail');
  await assert.rejects(
    verify(root, 'test', {
      execute: () => {
        writeFileSync(join(root, 'input.txt'), 'race');
        return {};
      },
    }),
    /Inputs changed/,
  );
  assert.equal(readJson(join(paths(root).evidence, 'test.json')).status, 'fail');
});
test('delivery rejects absent, stale and dirty evidence', async (t) => {
  const root = fixture(t);
  assert.throws(() => assertReady(root), /Missing or stale/);
  await verify(root, 'full', { execute: () => ({}) });
  assert.doesNotThrow(() => assertReady(root));
  const evidence = readJson(join(paths(root).evidence, 'full.json'));
  assert.equal(evidenceValid(evidence, identity(root), FULL), true);
  writeFileSync(join(root, 'new.txt'), 'new');
  assert.throws(() => assertReady(root), /clean/);
});
test('commit rejects partial staging instead of testing a different tree', async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'input.txt'), 'unstaged');
  await assert.rejects(verify(root, 'commit', { execute: () => ({}) }), /Unstaged/);
  writeFileSync(join(root, 'input.txt'), 'first');
  writeFileSync(join(root, 'untracked.txt'), 'not in the commit');
  await assert.rejects(verify(root, 'commit', { execute: () => ({}) }), /untracked/);
});
test('lock contention times out without running verification concurrently', async (t) => {
  const root = fixture(t);
  mkdirSync(paths(root).lock, { recursive: true });
  await assert.rejects(
    withLock(root, () => assert.fail('must not run'), 10),
    /busy/,
  );
});
test('scanner runtime dependencies remain forbidden', async (t) => {
  const root = fixture(t);
  writeJson(join(root, 'packages/cli/package.json'), { dependencies: { accidental: '1' } });
  await assert.rejects(verify(root, 'test', { execute: () => ({}) }), /zero runtime/);
});
test('docs, plugins and configuration receive the missing checks', () => {
  assert.deepEqual(documentationCommands(['docs/guide/a.md']), [['npm', ['run', 'docs:build']]]);
  assert.deepEqual(documentationCommands(['plugins/shared/a.md']).at(-1), [
    'npm',
    ['run', 'plugins:sync-check'],
  ]);
  assert.ok(documentationCommands(['biome.json']).some(([, args]) => args[0] === 'test'));
  assert.deepEqual(documentationCommands(['packages/cli/src/a.ts']), []);
});
test('toolkit integration joins the full gate only for an active pilot', (t) => {
  const root = fixture(t);
  assert.deepEqual(fullCommands(root), FULL);
  writeJson(paths(root).enabled, { version: VERSION, commit: SOURCE_COMMIT });
  assert.ok(fullCommands(root).some(([, args]) => args[1] === 'test:harness:integration'));
});
test('delivery detection includes RTK, draft, ready and native commands', () => {
  for (const prefix of ['', 'rtk ', 'rtk proxy ']) {
    for (const command of ['gh pr create', 'gh pr create --draft', 'gh pr ready'])
      assert.equal(deliveryCommand(prefix + command), true);
  }
  assert.equal(deliveryCommand('rtk gh pr view'), false);
  assert.equal(deliveryCommand('echo "gh pr create"'), false);
  assert.equal(deliveryCommand('node -e \'console.log("gh pr ready")\''), false);
});
test('disabled pilot is neutral; missing active runtime blocks acting events', (t) => {
  const root = fixture(t);
  assert.deepEqual(dispatch(root, 'cursor', 'tool-before', {}), {});
  writeJson(paths(root).enabled, { version: VERSION, commit: SOURCE_COMMIT });
  assert.equal(dispatch(root, 'cursor', 'tool-before', {}).permission, 'deny');
  assert.equal(dispatch(root, 'claude', 'tool-before', {}).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(
    dispatch(root, 'codex', 'tool-before', { hook_event_name: 'PreToolUse' }).hookSpecificOutput
      .permissionDecision,
    'deny',
  );
  assert.equal(
    dispatch(root, 'codex', 'tool-before', { hook_event_name: 'PermissionRequest' }).hookSpecificOutput
      .decision.behavior,
    'deny',
  );
});
test('a timed-out active runtime denies acting events', (t) => {
  const root = fixture(t);
  for (const file of ['bin/tlc-exec.mjs', 'dist/tool-before.mjs', 'dist/stop.mjs', 'dist/tlc-cli.mjs']) {
    const target = join(paths(root).runtime, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, '');
  }
  writeJson(join(paths(root).runtime, 'package.json'), { version: VERSION });
  writeJson(paths(root).source, { commit: SOURCE_COMMIT });
  writeJson(paths(root).enabled, { version: VERSION, commit: SOURCE_COMMIT });
  let calls = 0;
  const execute = () => {
    calls++;
    return { status: null, error: { code: 'ETIMEDOUT' }, stderr: '' };
  };
  const dependencies = { execute, health: () => null };
  assert.equal(dispatch(root, 'cursor', 'tool-before', {}, dependencies).permission, 'deny');
  assert.equal(dispatch(root, 'claude', 'stop', {}, dependencies).decision, 'block');
  assert.equal(calls, 2);
  assert.match(runtimeHealth(root, { nodeMajor: 23, probeBun: () => ({ status: 1 }) }), /Node 24/);
});
test('existing guard protects Cursor, Claude and Codex payload shapes', () => {
  for (const provider of ['cursor', 'claude', 'codex']) {
    for (const command of [
      'npm publish',
      'rtk git reset --hard',
      'git push origin main --force',
      'DROP TABLE data',
    ]) {
      const structured = provider !== 'cursor';
      const payload = structured ? { tool_input: { command } } : { command };
      const result = execFileSync(
        process.execPath,
        [join(ROOT, '.cursor/hooks/guard-shell.js'), ...(structured ? [`--${provider}`] : [])],
        { input: JSON.stringify(payload), encoding: 'utf8' },
      );
      const decision = JSON.parse(result);
      assert.equal(structured ? decision.hookSpecificOutput.permissionDecision : decision.permission, 'deny');
      if (!structured) assert.equal(typeof decision.user_message, 'string');
    }
  }
  const result = execFileSync(process.execPath, [join(ROOT, '.cursor/hooks/guard-shell.js')], {
    input: '{"command":"rtk git status"}',
    encoding: 'utf8',
  });
  assert.equal(JSON.parse(result).permission, 'allow');
});
test('formatter contains no runtime download and handles unavailable/outside files as advisory', () => {
  const source = readFileSync(join(ROOT, '.cursor/hooks/format-on-edit.js'), 'utf8');
  assert.equal(source.includes("execFileSync('npx'"), false);
  const result = spawnSync(process.execPath, [join(ROOT, '.cursor/hooks/format-on-edit.js')], {
    input: JSON.stringify({ file_path: join(tmpdir(), 'nonexistent-harness-example.ts') }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {});
  assert.match(result.stderr, /advisory/);
});
test('formatter uses the installed Biome binary for an in-repository file', (t) => {
  const directory = mkdtempSync(join(ROOT, 'tmp-harness-formatter-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const target = join(directory, 'sample.js');
  writeFileSync(target, 'const value={answer:42}\n');
  const result = spawnSync(process.execPath, [join(ROOT, '.cursor/hooks/format-on-edit.js')], {
    input: JSON.stringify({ file_path: target }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(target, 'utf8'), 'const value = { answer: 42 };\n');
});
