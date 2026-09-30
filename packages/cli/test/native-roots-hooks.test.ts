import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  collectCommands,
  collectHookConfigs,
  collectMcpConfigs,
  collectRules,
  collectSkills,
  collectSubagents,
  detectHarnesses,
} from '../src/harness/collectors.js';
import { readNormalizedHooks } from '../src/harness/hooks.js';
import { matchPathSpec, PATH_SPECS } from '../src/harness/registry.js';
import { createScanContext } from '../src/scan.js';
import type { ScanContext } from '../src/types.js';
import { check, fakeContext } from './helpers.js';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function createNativeTree(nativeRoot: string, files: Record<string, string>): string {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-native-root-'));
  tempRoots.push(parent);
  const root = path.join(parent, nativeRoot);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, ...relative.split('/'));
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, 'utf8');
  }
  return root;
}

const canonicalExamples = [
  '.cursor/rules/example.mdc',
  '.windsurf/rules/example.md',
  '.clinerules/example.md',
  '.continue/rules/example.md',
  '.github/instructions/example.instructions.md',
  '.agents/rules/example',
  '.agent/rules/example',
  '.gemini/rules/example',
  '.claude/rules/example.md',
  '.cursor/skills/example/SKILL.md',
  '.claude/skills/example/SKILL.md',
  '.devin/skills/example/SKILL.md',
  '.agents/skills/example/SKILL.md',
  '.cursor/commands/example.md',
  '.claude/commands/example.md',
  '.windsurf/workflows/example.md',
  '.continue/prompts/example',
  '.zed/commands/example.md',
  '.agents/workflows/example',
  '.agent/workflows/example',
  '.cursor/agents/example.md',
  '.claude/agents/example.md',
  '.opencode/agents/example.md',
  '.cursor/hooks.json',
  '.claude/settings.json',
  '.devin/hooks.v1.json',
  '.devin/config.json',
  '.cursor/mcp.json',
  '.agents/mcp_config.json',
  '.agent/mcp_config.json',
];

function checkOutcomes(ctx: ScanContext, ids: string[]): Promise<boolean[]> {
  return Promise.all(ids.map(async (id) => (await check(id)).run(ctx).passed));
}

describe('tool-native scan roots', () => {
  test('collects repository Devin hooks from the canonical path', () => {
    const ctx = fakeContext({ '.devin/hooks.v1.json': '{}' });
    expect(collectHookConfigs(ctx)).toEqual([
      {
        path: '.devin/hooks.v1.json',
        canonicalPath: '.devin/hooks.v1.json',
        nativeDepth: 0,
        toolId: 'devin',
        kind: 'hooks',
      },
    ]);
  });

  test.each(
    PATH_SPECS.filter((spec) => spec.nativeRoot),
  )('$toolId $kind recognizes its physical path when $nativeRoot is the scan root', (spec) => {
    const canonicalPath = canonicalExamples.find(
      (candidate) => candidate.startsWith(`${spec.nativeRoot}/`) && spec.pathRegex.test(candidate),
    );
    expect(canonicalPath).toBeDefined();
    const physicalPath = canonicalPath!.slice(spec.nativeRoot!.length + 1);
    const ctx = fakeContext({ [physicalPath]: 'content' }, `/repo/${spec.nativeRoot}`);
    expect(matchPathSpec(ctx, spec)).toEqual([{ path: physicalPath, canonicalPath, nativeDepth: 0 }]);
  });

  test('does not treat generic config filenames as harness artifacts under an arbitrary root', () => {
    const ctx = fakeContext(
      {
        'settings.json': '{}',
        'hooks.json': '{}',
        'mcp.json': '{}',
        'skills/example/SKILL.md': 'content',
        'commands/example.md': 'content',
        'agents/example.md': 'content',
      },
      '/repo/arbitrary',
    );
    for (const spec of PATH_SPECS.filter((candidate) => candidate.nativeRoot)) {
      expect(matchPathSpec(ctx, spec)).toEqual([]);
    }
  });

  test('reads physical Claude artifacts when .claude is the real filesystem root', () => {
    const root = createNativeTree('.claude', {
      'settings.json': JSON.stringify({
        hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: './hooks/guard.js' }] }] },
      }),
      'hooks/guard.js': '// present',
      'skills/review/SKILL.md':
        '---\nname: review\ndescription: Review changes with deterministic project checks.\n---',
      'agents/reviewer.md': '---\nname: reviewer\ndescription: Review changes before merge.\n---',
    });
    const ctx = createScanContext(root);
    expect(collectHookConfigs(ctx)[0]).toMatchObject({
      path: 'settings.json',
      canonicalPath: '.claude/settings.json',
    });
    expect(collectSkills(ctx)[0]).toMatchObject({ path: 'skills/review/SKILL.md' });
    expect(collectSubagents(ctx)[0]).toMatchObject({ path: 'agents/reviewer.md' });
    expect(ctx.read(collectHookConfigs(ctx)[0]!.path)).toContain('PreToolUse');
  });

  test('reads physical Cursor artifacts when .cursor is the real filesystem root', () => {
    const root = createNativeTree('.cursor', {
      'hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: './hooks/guard.js' }] },
      }),
      'hooks/guard.js': '// present',
      'rules/project.mdc': '---\nalwaysApply: true\n---\nRule',
      'commands/review.md': '# Review',
      'mcp.json': '{}',
    });
    const ctx = createScanContext(root);
    expect(collectHookConfigs(ctx)[0]).toMatchObject({
      path: 'hooks.json',
      canonicalPath: '.cursor/hooks.json',
    });
    expect(collectRules(ctx)[0]).toMatchObject({ path: 'rules/project.mdc' });
    expect(collectCommands(ctx)[0]).toMatchObject({ path: 'commands/review.md' });
    expect(collectMcpConfigs(ctx)[0]).toMatchObject({ path: 'mcp.json' });
  });

  test('reads and scores a physical Devin skill when .devin is the filesystem root', async () => {
    const root = createNativeTree('.devin', {
      'skills/review/SKILL.md':
        '---\nname: review\ndescription: Use when reviewing changes with deterministic project checks.\n---',
    });
    const ctx = createScanContext(root);
    expect(collectSkills(ctx)).toEqual([
      {
        path: 'skills/review/SKILL.md',
        canonicalPath: '.devin/skills/review/SKILL.md',
        nativeDepth: 0,
        toolId: 'devin',
        kind: 'skills',
      },
    ]);
    expect(await checkOutcomes(ctx, ['SKL-01', 'SKL-02', 'SKL-03', 'SKL-04'])).toEqual([
      true,
      true,
      false,
      true,
    ]);
    expect(detectHarnesses(ctx)).toEqual(['devin']);
  });

  test('reads and scores physical Devin hooks when .devin is the filesystem root', async () => {
    const hooks = JSON.stringify({
      PreToolUse: [{ hooks: [{ type: 'command', command: 'python hooks/guard.py' }] }],
      PostCompaction: [{ hooks: [{ type: 'prompt', prompt: 'Restore the task context.' }] }],
    });
    const root = createNativeTree('.devin', {
      'hooks.v1.json': hooks,
      'hooks/guard.py': '# present',
    });
    const ctx = createScanContext(root);
    expect(collectHookConfigs(ctx)).toEqual([
      {
        path: 'hooks.v1.json',
        canonicalPath: '.devin/hooks.v1.json',
        nativeDepth: 0,
        toolId: 'devin',
        kind: 'hooks',
      },
    ]);
    expect(await checkOutcomes(ctx, ['HKS-01', 'HKS-02', 'HKS-03', 'HKS-04', 'HKS-05'])).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(detectHarnesses(ctx)).toEqual(['devin']);
  });

  test('keeps skill, agent, hook, and harness detection outcomes invariant', async () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              {
                type: 'command',
                command: 'node',
                args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.js'],
              },
            ],
          },
        ],
        PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'prompt', prompt: 'Review $ARGUMENTS' }] }],
      },
    });
    const skill = '---\nname: review\ndescription: Review changes with deterministic project checks.\n---';
    const agent = '---\nname: reviewer\ndescription: Review changes before merge.\n---';
    const canonical = fakeContext({
      '.claude/settings.json': settings,
      '.claude/hooks/guard.js': '// present',
      '.claude/skills/review/SKILL.md': skill,
      '.claude/agents/reviewer.md': agent,
    });
    const native = fakeContext(
      {
        'settings.json': settings,
        'hooks/guard.js': '// present',
        'skills/review/SKILL.md': skill,
        'agents/reviewer.md': agent,
      },
      '/repo/.claude',
    );
    const ids = ['SKL-01', 'SKL-02', 'AGT-01', 'AGT-02', 'HKS-01', 'HKS-02', 'HKS-03', 'HKS-04', 'HKS-05'];
    expect(await checkOutcomes(native, ids)).toEqual(await checkOutcomes(canonical, ids));
    expect(detectHarnesses(native)).toEqual(detectHarnesses(canonical));
  });
});

describe('deterministic hook normalization', () => {
  test('prefers a root configuration over a richer nested scratch configuration', () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'echo root' }] }] },
      }),
      'scratch/.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: {
          beforeShellExecution: [{ command: 'echo nested' }],
          afterFileEdit: [{ command: 'echo nested' }],
          stop: [{ command: 'echo nested' }],
        },
      }),
    });
    const normalized = readNormalizedHooks(ctx);
    expect(normalized?.source).toBe('.claude/settings.json');
    expect(normalized?.selectionWarnings).toEqual([
      expect.objectContaining({ source: 'scratch/.cursor/hooks.json', code: 'ignored-hook-config' }),
    ]);
  });

  test('does not let an empty or invalid root configuration shadow a valid alternative', () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({ permissions: { allow: ['Bash(npm test)'] } }),
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'echo valid' }] },
      }),
      'scratch/.claude/settings.json': '{ invalid json',
    });
    const normalized = readNormalizedHooks(ctx);
    expect(normalized?.source).toBe('.cursor/hooks.json');
    expect(normalized?.selectionWarnings.map((warning) => warning.source)).toEqual([
      '.claude/settings.json',
      'scratch/.claude/settings.json',
    ]);
  });

  test('does not let an invalid Claude configuration shadow valid Devin hooks', () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({ hooks: { PreToolUse: [{ hooks: [] }] } }),
      '.devin/hooks.v1.json': JSON.stringify({
        PreToolUse: [{ hooks: [{ type: 'command', command: 'echo valid' }] }],
      }),
    });
    const normalized = readNormalizedHooks(ctx);
    expect(normalized?.source).toBe('.devin/hooks.v1.json');
    expect(normalized?.toolId).toBe('devin');
    expect(normalized?.selectionWarnings).toEqual([
      expect.objectContaining({ source: '.claude/settings.json', code: 'ignored-hook-config' }),
    ]);
  });

  test('uses event count and lexical path only after native depth', () => {
    const ctx = fakeContext({
      'packages/z/.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'echo z' }] },
      }),
      'packages/a/.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'echo a' }] },
      }),
    });
    expect(readNormalizedHooks(ctx)?.source).toBe('packages/a/.cursor/hooks.json');
  });
});

const claudeEvents = [
  'SessionStart',
  'Setup',
  'InstructionsLoaded',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'MessageDisplay',
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'PermissionDenied',
  'Notification',
  'SubagentStart',
  'SubagentStop',
  'TaskCreated',
  'TaskCompleted',
  'Stop',
  'StopFailure',
  'TeammateIdle',
  'ConfigChange',
  'CwdChanged',
  'DirectoryAdded',
  'FileChanged',
  'WorktreeCreate',
  'WorktreeRemove',
  'PreCompact',
  'PostCompact',
  'SessionEnd',
  'Elicitation',
  'ElicitationResult',
] as const;

describe('modern hook contract', () => {
  test('accepts all 31 documented Claude Code events', async () => {
    expect(claudeEvents).toHaveLength(31);
    const hooks = Object.fromEntries(
      claudeEvents.map((event) => [event, [{ hooks: [{ type: 'command', command: 'echo ok' }] }]]),
    );
    const outcome = (await check('HKS-02')).run(
      fakeContext({ '.claude/settings.json': JSON.stringify({ hooks }) }),
    );
    expect(outcome.passed).toBe(true);
    expect(outcome.warnings).toEqual([]);
  });

  test('accepts command, http, mcp_tool, prompt, and agent handlers', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              hooks: [
                { type: 'command', command: 'node', args: [] },
                { type: 'http', url: 'https://example.test/hook' },
                { type: 'mcp_tool', server: 'security', tool: 'scan' },
                { type: 'prompt', prompt: 'Review $ARGUMENTS' },
                { type: 'agent', prompt: 'Verify $ARGUMENTS' },
              ],
            },
          ],
        },
      }),
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
  });

  test('rejects empty events and handlers missing required fields', async () => {
    const empty = fakeContext({
      '.claude/settings.json': JSON.stringify({ hooks: { PreToolUse: [] } }),
    });
    expect((await check('HKS-02')).run(empty).passed).toBe(false);

    const invalidHandlers = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              hooks: [
                { type: 'command' },
                { type: 'http' },
                { type: 'mcp_tool', server: 'security' },
                { type: 'prompt' },
                { type: 'agent' },
              ],
            },
          ],
        },
      }),
    });
    expect((await check('HKS-02')).run(invalidHandlers).passed).toBe(false);
  });

  test('HKS-05 passes when only valid non-command handlers are selected', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: { PreToolUse: [{ hooks: [{ type: 'http', url: 'https://example.test/hook' }] }] },
      }),
    });
    const outcome = (await check('HKS-05')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('no repository scripts');
  });

  test('HKS-05 validates executable and every path-bearing argument', async () => {
    const settings = (secondArg: string) =>
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/runner.js',
                  args: ['.claude/hooks/policy.json', `--config=${secondArg}`],
                },
              ],
            },
          ],
        },
      });
    const files = {
      '.claude/hooks/runner.js': '// present',
      '.claude/hooks/policy.json': '{}',
      '.claude/hooks/extra.json': '{}',
    };
    const passing = fakeContext({ '.claude/settings.json': settings('.claude/hooks/extra.json'), ...files });
    expect((await check('HKS-05')).run(passing).passed).toBe(true);

    const failing = fakeContext({
      '.claude/settings.json': settings('.claude/hooks/missing.json'),
      ...files,
    });
    const outcome = (await check('HKS-05')).run(failing);
    expect(outcome.passed).toBe(false);
    expect(outcome.evidence).toContain('.claude/hooks/missing.json');
  });

  test('resolves project-prefixed paths to physical files under a native root', async () => {
    const ctx = fakeContext(
      {
        'settings.json': JSON.stringify({
          hooks: {
            PreToolUse: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: 'node',
                    args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.js'],
                  },
                ],
              },
            ],
          },
        }),
        'hooks/guard.js': '// present',
      },
      '/repo/.claude',
    );
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('does not require external plugin-root scripts to be committed in the repository', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PLUGIN_ROOT}/scripts/check.sh',
                  args: ['$HOME/shared/policy.json'],
                },
              ],
            },
          ],
        },
      }),
    });
    const outcome = (await check('HKS-05')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('nothing to resolve');
  });
});
