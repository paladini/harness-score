import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { git, isolatedEnv, paths, ROOT, readJson, VERSION, writeJson } from '../common.mjs';

if (!existsSync(join(paths(ROOT).runtime, 'dist/stop.mjs')))
  throw new Error('Run npm run harness:setup before integration tests.');

function fixture(t, engine) {
  const root = mkdtempSync(join(tmpdir(), 'toolkit integration space '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const p = paths(root);
  cpSync(paths(ROOT).runtime, p.runtime, { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, '.gitignore'), '.cache/\n.tlc/harness/state/\n');
  writeFileSync(join(root, 'src/example.js'), 'export const value = 1;\n');
  writeJson(join(root, '.tlc/harness/config.json'), {
    version: 1,
    codePaths: ['src'],
    grind: {
      enabled: true,
      maxLoops: 3,
      testCommand: ['node', '-e', 'process.exit(require("fs").existsSync("fail") ? 1 : 0)'],
      appendFiles: 'never',
    },
    rules: { enabled: true },
    intelligence: { lessons: { enabled: false } },
  });
  mkdirSync(join(root, '.tlc/harness/rules'), { recursive: true });
  writeFileSync(
    join(root, '.tlc/harness/rules/review.md'),
    '---\non: command(gh pr ready)\nrequire:\n  - subagent(harness-reviewer) since HEAD\notherwise: deny\n---\nRun the independent reviewer.\n',
  );
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
  // Runtime selection is test configuration; no rule observations or verdicts are fabricated.
  if (engine === 'node') writeJson(join(p.runtime, 'state/runtime-cache.json'), { bunPath: null });
  return root;
}
function event(root, provider, kind, extra = {}) {
  const names = {
    start: ['sessionStart', 'SessionStart'],
    before: ['beforeShellExecution', 'PreToolUse'],
    stop: ['stop', 'Stop'],
    reviewer: ['subagentStop', 'SubagentStop'],
  };
  return provider === 'cursor'
    ? {
        hook_event_name: names[kind][0],
        conversation_id: 'integration',
        workspace_roots: [root],
        status: 'completed',
        ...extra,
      }
    : { hook_event_name: names[kind][1], session_id: 'integration', cwd: root, tool_name: 'Bash', ...extra };
}
function invoke(root, provider, handler, payload) {
  const result = spawnSync(
    process.execPath,
    [join(paths(root).runtime, 'bin/tlc-exec.mjs'), '--provider', provider, handler],
    {
      cwd: root,
      env: isolatedEnv(root),
      input: JSON.stringify(payload),
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim() || '{}');
}
function invokeAsync(root, provider, handler, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(paths(root).runtime, 'bin/tlc-exec.mjs'), '--provider', provider, handler],
      {
        cwd: root,
        env: isolatedEnv(root),
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.once('error', reject);
    child.once('close', (status) => {
      if (status !== 0) reject(new Error(stderr || `hook exited ${status}`));
      else resolve(JSON.parse(stdout.trim() || '{}'));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
function denied(output) {
  return (
    output.permission === 'deny' ||
    output.decision === 'block' ||
    output.hookSpecificOutput?.permissionDecision === 'deny' ||
    Boolean(output.followup_message)
  );
}
for (const engine of ['bun', 'node']) {
  for (const provider of ['cursor', 'claude', 'codex']) {
    test(`${provider}/${engine}: real entrypoints produce review proof and reject a stale commit`, (t) => {
      const root = fixture(t, engine);
      invoke(root, provider, 'session-start', event(root, provider, 'start'));
      const command = 'rtk proxy gh pr ready';
      const payload = event(
        root,
        provider,
        'before',
        provider === 'cursor' ? { command } : { tool_input: { command } },
      );
      assert.equal(denied(invoke(root, provider, 'tool-before', payload)), true);
      invoke(
        root,
        provider,
        'subagent-stop',
        event(root, provider, 'reviewer', {
          subagent_type: 'harness-reviewer',
          agent_type: 'harness-reviewer',
          agent_id: 'reviewer',
          status: 'completed',
        }),
      );
      const output = invoke(root, provider, 'tool-before', payload);
      assert.equal(denied(output), false, JSON.stringify(output));
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
        'new head',
      ]);
      assert.equal(denied(invoke(root, provider, 'tool-before', payload)), true);
    });
    test(`${provider}/${engine}: failing gate produces feedback, then passes after correction`, (t) => {
      const root = fixture(t, engine);
      invoke(root, provider, 'session-start', event(root, provider, 'start'));
      writeFileSync(join(root, 'src/example.js'), 'export const value = 2;\n');
      writeFileSync(join(root, 'fail'), 'fail test');
      const failed = invoke(root, provider, 'stop', event(root, provider, 'stop', { loop_count: 0 }));
      assert.equal(denied(failed), true, JSON.stringify(failed));
      assert.equal(readJson(join(root, '.tlc/harness/state/last-gate.json'))?.passed, false);
      rmSync(join(root, 'fail'));
      writeFileSync(join(root, 'src/example.js'), 'export const value = 3;\n');
      const passed = invoke(root, provider, 'stop', event(root, provider, 'stop', { loop_count: 1 }));
      assert.equal(denied(passed), false, JSON.stringify(passed));
      assert.equal(readJson(join(root, '.tlc/harness/state/last-gate.json'))?.passed, true);
    });
    test(`${provider}/${engine}: secret read is denied without reading a credential`, (t) => {
      const root = fixture(t, engine);
      invoke(root, provider, 'session-start', event(root, provider, 'start'));
      const command = 'cat .env';
      const payload = event(
        root,
        provider,
        'before',
        provider === 'cursor' ? { command } : { tool_input: { command } },
      );
      assert.equal(denied(invoke(root, provider, 'tool-before', payload)), true);
    });
  }
}

test('two provider sessions can start concurrently without corrupting presence state', async (t) => {
  const root = fixture(t, 'node');
  await Promise.all([
    invokeAsync(root, 'cursor', 'session-start', event(root, 'cursor', 'start')),
    invokeAsync(root, 'claude', 'session-start', event(root, 'claude', 'start')),
    invokeAsync(root, 'codex', 'session-start', event(root, 'codex', 'start')),
  ]);
  const presence = join(root, '.tlc/harness/state/presence');
  assert.equal(readJson(join(presence, 'cursor-integration.json'))?.provider, 'cursor');
  assert.equal(readJson(join(presence, 'claude-integration.json'))?.provider, 'claude');
  assert.equal(readJson(join(presence, 'codex-integration.json'))?.provider, 'codex');
});

test('installed version and complete project hook coverage match the isolated provider documents', () => {
  assert.equal(readJson(join(paths(ROOT).runtime, 'package.json')).version, VERSION);
  for (const [provider, source, target] of [
    ['cursor', join(paths(ROOT).cursor, 'hooks.json'), '.cursor/hooks.json'],
    ['claude', join(paths(ROOT).claude, 'settings.json'), '.claude/settings.json'],
    ['codex', join(paths(ROOT).codex, 'hooks.json'), '.codex/hooks.json'],
  ]) {
    const generated = JSON.parse(readFileSync(source, 'utf8'));
    const project = readJson(join(ROOT, target));
    for (const name of Object.keys(generated.hooks)) {
      assert.ok(
        project.hooks[name]?.some((entry) => JSON.stringify(entry).includes('scripts/harness/hook.mjs')),
        `${provider} missing ${name}`,
      );
    }
  }
});

test('project Codex commands resolve the repository from a subdirectory', () => {
  const document = readJson(join(ROOT, '.codex/hooks.json'));
  const groups = document.hooks.PreToolUse;
  const payload = JSON.stringify({
    hook_event_name: 'PreToolUse',
    cwd: join(ROOT, 'packages/cli'),
    tool_name: 'Bash',
    tool_input: { command: 'npm publish' },
    transcript_path: join(ROOT, '.codex/sessions/integration.jsonl'),
  });
  for (const marker of ['guard-shell.js', 'scripts/harness/hook.mjs']) {
    const hook = groups
      .flatMap((group) => group.hooks)
      .find((candidate) => candidate.command.includes(marker));
    assert.ok(hook, `missing Codex project command for ${marker}`);
    const command = process.platform === 'win32' ? hook.commandWindows : hook.command;
    const result = spawnSync(command, {
      cwd: join(ROOT, 'packages/cli'),
      shell: true,
      input: payload,
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotThrow(() => JSON.parse(result.stdout.trim() || '{}'));
  }
  assert.equal(
    existsSync(join(ROOT, 'packages/cli/.tlc')),
    false,
    'Codex hook state must remain anchored at the repository root',
  );
});
