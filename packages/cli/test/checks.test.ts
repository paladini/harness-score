import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/checks/index.js';
import { readNormalizedHooks } from '../src/harness/hooks.js';
import { check, fakeContext } from './helpers.js';

describe('context checks', () => {
  test('CTX-01 fails with no AGENTS.md or CLAUDE.md', async () => {
    const ctx = fakeContext({});
    expect((await check('CTX-01')).run(ctx).passed).toBe(false);
  });

  test('CTX-01 passes when AGENTS.md exists', async () => {
    const ctx = fakeContext({ 'AGENTS.md': '# Hi' });
    expect((await check('CTX-01')).run(ctx).passed).toBe(true);
  });

  test('CTX-02 fails on a thin AGENTS.md', async () => {
    const ctx = fakeContext({ 'AGENTS.md': '# Hi\nuse good code\n' });
    expect((await check('CTX-02')).run(ctx).passed).toBe(false);
  });

  test('CTX-03 fails with no rules under .cursor/rules/', async () => {
    const ctx = fakeContext({});
    expect((await check('CTX-03')).run(ctx).passed).toBe(false);
  });

  test('CTX-03 passes with at least one .mdc rule', async () => {
    const ctx = fakeContext({ '.cursor/rules/style.mdc': '---\ndescription: x\n---\nbody' });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
  });

  test('CTX-03 passes with a Windsurf rule file', async () => {
    const ctx = fakeContext({
      '.windsurf/rules/style.md': '---\ndescription: x\ntrigger: src/**\n---\nbody',
    });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
  });

  test('CTX-04 passes with Windsurf trigger frontmatter', async () => {
    const ctx = fakeContext({
      '.windsurf/rules/api.md': '---\ndescription: API\ntrigger: src/api/**\n---\nbody',
    });
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
  });

  test('CTX-05 passes when a Cline rule uses paths scoping', async () => {
    const ctx = fakeContext({
      '.clinerules/core.md': '---\npaths: ["**"]\n---\ncore',
      '.clinerules/http.md': '---\npaths: ["src/app.js"]\n---\nhttp',
    });
    expect((await check('CTX-05')).run(ctx).passed).toBe(true);
  });

  test('CTX-08 passes when .cursorrules exists alongside modern rules', async () => {
    const ctx = fakeContext({
      '.cursorrules': 'legacy',
      '.windsurf/rules/modern.md': '---\ndescription: x\ntrigger: src/**\n---\nbody',
    });
    expect((await check('CTX-08')).run(ctx).passed).toBe(true);
  });

  test('CTX-04 rejects rules without frontmatter', async () => {
    const ctx = fakeContext({ '.cursor/rules/naked.mdc': 'Just some prose, no frontmatter.' });
    expect((await check('CTX-04')).run(ctx).passed).toBe(false);
  });

  test('CTX-05 fails when every rule is always-on with none scoped', async () => {
    const ctx = fakeContext({
      '.cursor/rules/a.mdc': '---\nalwaysApply: true\n---\na',
      '.cursor/rules/b.mdc': '---\nalwaysApply: true\n---\nb',
    });
    expect((await check('CTX-05')).run(ctx).passed).toBe(false);
  });

  test('CTX-05 passes when at least one rule is glob-scoped', async () => {
    const ctx = fakeContext({
      '.cursor/rules/a.mdc': '---\nalwaysApply: true\n---\na',
      '.cursor/rules/b.mdc': '---\nglobs: src/**\n---\nb',
    });
    expect((await check('CTX-05')).run(ctx).passed).toBe(true);
  });

  test('CTX-06 flags a 600-line rule', async () => {
    const ctx = fakeContext({
      '.cursor/rules/huge.mdc': `---\ndescription: x\n---\n${'line\n'.repeat(600)}`,
    });
    expect((await check('CTX-06')).run(ctx).passed).toBe(false);
  });

  test('CTX-07 fails with no README.md', async () => {
    const ctx = fakeContext({});
    expect((await check('CTX-07')).run(ctx).passed).toBe(false);
  });

  test('CTX-07 passes when README.md exists', async () => {
    const ctx = fakeContext({ 'README.md': '# Project' });
    expect((await check('CTX-07')).run(ctx).passed).toBe(true);
  });

  test('CTX-08 flags legacy .cursorrules', async () => {
    const ctx = fakeContext({ '.cursorrules': 'old style' });
    expect((await check('CTX-08')).run(ctx).passed).toBe(false);
  });
});

describe('skills checks', () => {
  test('SKL-01 fails with no SKILL.md anywhere', async () => {
    const ctx = fakeContext({});
    expect((await check('SKL-01')).run(ctx).passed).toBe(false);
  });

  test('SKL-01 passes with at least one SKILL.md', async () => {
    const ctx = fakeContext({
      '.cursor/skills/deploy/SKILL.md': '---\nname: deploy\ndescription: short\n---\n',
    });
    expect((await check('SKL-01')).run(ctx).passed).toBe(true);
  });

  test('SKL-01 passes with a Claude Code skill', async () => {
    const ctx = fakeContext({
      '.claude/skills/release/SKILL.md': '---\nname: release\ndescription: x\n---\n',
    });
    expect((await check('SKL-01')).run(ctx).passed).toBe(true);
  });

  test('Devin skills pass SKL-01/02/04 without counting as SKL-03 commands', async () => {
    const ctx = fakeContext({
      '.devin/skills/review/SKILL.md':
        '---\nname: review\ndescription: Use when reviewing changes with deterministic project checks.\n---\nbody',
    });
    const outcomes = await Promise.all(
      ['SKL-01', 'SKL-02', 'SKL-03', 'SKL-04'].map(async (id) => (await check(id)).run(ctx)),
    );
    expect(outcomes.map((outcome) => outcome.passed)).toEqual([true, true, false, true]);
    expect(outcomes[0]?.evidence).toContain('(devin)');
  });

  test('Devin skills without frontmatter still fail metadata checks', async () => {
    const ctx = fakeContext({ '.devin/skills/review/SKILL.md': '# Review\nNo frontmatter.' });
    expect((await check('SKL-01')).run(ctx).passed).toBe(true);
    expect((await check('SKL-02')).run(ctx).passed).toBe(false);
    expect((await check('SKL-04')).run(ctx).passed).toBe(false);
  });

  test('SKL-02 fails when a skill is missing name/description frontmatter', async () => {
    const ctx = fakeContext({ '.cursor/skills/deploy/SKILL.md': '# Deploy\nNo frontmatter.' });
    expect((await check('SKL-02')).run(ctx).passed).toBe(false);
  });

  test('SKL-02 passes when every skill declares name and description', async () => {
    const ctx = fakeContext({
      '.cursor/skills/deploy/SKILL.md':
        '---\nname: deploy\ndescription: Use when deploying the app to production.\n---\nbody',
    });
    expect((await check('SKL-02')).run(ctx).passed).toBe(true);
  });

  test('SKL-03 fails with no .cursor/commands/*.md', async () => {
    const ctx = fakeContext({});
    expect((await check('SKL-03')).run(ctx).passed).toBe(false);
  });

  test('SKL-03 passes with at least one slash command', async () => {
    const ctx = fakeContext({ '.cursor/commands/release.md': '# /release' });
    expect((await check('SKL-03')).run(ctx).passed).toBe(true);
  });

  test('SKL-03 passes with a Windsurf workflow', async () => {
    const ctx = fakeContext({ '.windsurf/workflows/audit.md': '# /audit' });
    expect((await check('SKL-03')).run(ctx).passed).toBe(true);
  });

  test('SKL-04 fails when a skill description is under 40 characters', async () => {
    const ctx = fakeContext({
      '.cursor/skills/deploy/SKILL.md': '---\nname: deploy\ndescription: short\n---\n',
    });
    expect((await check('SKL-04')).run(ctx).passed).toBe(false);
  });

  test('SKL-04 passes when every skill description is 40+ characters', async () => {
    const ctx = fakeContext({
      '.cursor/skills/deploy/SKILL.md':
        '---\nname: deploy\ndescription: Use when deploying the app to production.\n---\nbody',
    });
    expect((await check('SKL-04')).run(ctx).passed).toBe(true);
  });
});

describe('hook checks', () => {
  const devinCommand = (command = 'echo ok') => [{ hooks: [{ type: 'command', command }] }];
  const devinPythonCommand = (script: string) =>
    `python -c "import os, runpy; runpy.run_path(os.path.join(os.environ['DEVIN_PROJECT_DIR'], '.devin', 'hooks', '${script}'), run_name='__main__')"`;

  test('HKS-01 and HKS-02 accept standalone Devin events without a wrapper or version', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({ PreToolUse: devinCommand() }),
    });
    expect((await check('HKS-01')).run(ctx).passed).toBe(true);
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect(readNormalizedHooks(ctx)?.versionRequirement).toBe('not-required');
  });

  test('HKS-01 accepts Devin hooks nested under .devin/config.json', async () => {
    const ctxWithoutHooks = fakeContext({
      '.devin/config.json': JSON.stringify({ model: 'default' }),
    });
    expect((await check('HKS-01')).run(ctxWithoutHooks).passed).toBe(false);
    const ctxWithHooks = fakeContext({
      '.devin/config.json': JSON.stringify({ hooks: { PreToolUse: devinCommand() } }),
    });
    expect((await check('HKS-01')).run(ctxWithHooks).passed).toBe(true);
    expect(readNormalizedHooks(ctxWithHooks)?.source).toBe('.devin/config.json');
  });

  test('HKS-01 preserves Devin ownership and version policy for invalid JSON', async () => {
    const ctx = fakeContext({ '.devin/hooks.v1.json': '{ not json' });
    const normalized = readNormalizedHooks(ctx);
    expect(normalized?.toolId).toBe('devin');
    expect(normalized?.versionRequirement).toBe('not-required');
    expect(normalized?.structuralErrors).toEqual(['Hook configuration is not valid JSON.']);
    expect((await check('HKS-01')).run(ctx).passed).toBe(false);
  });

  test('HKS-01 treats a valid non-object Devin root as a structural error', async () => {
    const ctx = fakeContext({ '.devin/hooks.v1.json': 'null' });
    const normalized = readNormalizedHooks(ctx);
    expect(normalized?.versionRequirement).toBe('not-required');
    expect(normalized?.structuralErrors).toEqual(['The root value must be an event map object.']);
    expect((await check('HKS-01')).run(ctx).passed).toBe(false);
  });

  test('HKS-02 accepts every documented Devin event without warnings', async () => {
    const events = [
      'PreToolUse',
      'PostToolUse',
      'PermissionRequest',
      'UserPromptSubmit',
      'Stop',
      'PostCompaction',
      'SessionStart',
      'SessionEnd',
    ];
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify(
        Object.fromEntries(events.map((event) => [event, devinCommand()])),
      ),
    });
    const outcome = (await check('HKS-02')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.warnings).toEqual([]);
  });

  test('HKS-02 preserves points for a structurally valid future Devin event and emits a warning', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({ FutureLifecycleEvent: devinCommand() }),
    });
    const outcome = (await check('HKS-02')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('FutureLifecycleEvent');
    expect(outcome.warnings).toEqual([
      expect.objectContaining({ code: 'unknown-hook-event', source: '.devin/hooks.v1.json' }),
    ]);
  });

  test.each([
    ['empty matcher groups', { PreToolUse: [] }],
    ['non-object matcher groups', { PreToolUse: [null] }],
    ['empty hooks arrays', { PreToolUse: [{ hooks: [] }] }],
    ['non-object handlers', { PreToolUse: [{ hooks: [null] }] }],
    ['handlers without a type', { PreToolUse: [{ hooks: [{ command: 'echo invalid' }] }] }],
    ['unknown handler types', { PreToolUse: [{ hooks: [{ type: 'http', url: 'https://example.test' }] }] }],
    ['command handlers without command', { PreToolUse: [{ hooks: [{ type: 'command' }] }] }],
    ['prompt handlers without prompt', { PreToolUse: [{ hooks: [{ type: 'prompt' }] }] }],
  ])('HKS-02 rejects Devin %s', async (_label, hooks) => {
    const ctx = fakeContext({ '.devin/hooks.v1.json': JSON.stringify(hooks) });
    expect((await check('HKS-02')).run(ctx).passed).toBe(false);
  });

  test('HKS-02 accepts documented optional Devin matcher and timeout fields', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({
        PreToolUse: [
          {
            matcher: '^exec$',
            hooks: [
              { type: 'command', command: 'echo ok', timeout: 5 },
              { type: 'prompt', prompt: 'Review this operation.', timeout: 10 },
            ],
          },
        ],
      }),
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
  });

  test('HKS-05 does not invent a script path for a Devin prompt handler', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({
        UserPromptSubmit: [{ hooks: [{ type: 'prompt', prompt: 'Review the prompt.' }] }],
      }),
    });
    const outcome = (await check('HKS-05')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('no repository scripts');
  });

  test('HKS-01 fails on invalid JSON', async () => {
    const ctx = fakeContext({ '.cursor/hooks.json': '{ not json' });
    const outcome = (await check('HKS-01')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.warnings).toEqual([
      expect.objectContaining({ code: 'invalid-hook-config', source: '.cursor/hooks.json' }),
    ]);
  });

  test('HKS-02 preserves points for structurally valid future events and emits a warning', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({ version: 1, hooks: { onFileSave: [{ command: 'x' }] } }),
    });
    const outcome = (await check('HKS-02')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('onFileSave');
    expect(outcome.warnings).toEqual([
      expect.objectContaining({ code: 'unknown-hook-event', source: '.cursor/hooks.json' }),
    ]);
  });

  test('HKS-05 flags hook scripts that do not exist', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: './.cursor/hooks/missing.sh' }] },
      }),
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(false);
  });

  test('HKS-05 resolves backslash-style Windows paths when the script exists', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'node .cursor\\hooks\\guard.js' }] },
      }),
      '.cursor/hooks/guard.js': '// present',
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('HKS-05 flags backslash-style paths when the script is actually missing', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'node .cursor\\hooks\\missing.js' }] },
      }),
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(false);
  });

  test('HKS-05 resolves a quoted path with trailing arguments', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: '"./.cursor/hooks/guard.sh" --arg' }] },
      }),
      '.cursor/hooks/guard.sh': '#!/bin/sh',
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('HKS-05 resolves the unbraced $VAR form (Claude Code) when the script exists', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: '$CLAUDE_PROJECT_DIR/.claude/hooks/setup.sh' }] },
          ],
        },
      }),
      '.claude/hooks/setup.sh': '#!/bin/sh',
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('HKS-05 flags the unbraced $VAR form when the script is actually missing', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: '$CLAUDE_PROJECT_DIR/.claude/hooks/missing.sh' }] },
          ],
        },
      }),
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(false);
  });

  test('HKS-05 treats a node_modules/.bin/ command as resolved without requiring it committed', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                { type: 'command', command: '${CLAUDE_PROJECT_DIR}/node_modules/.bin/block-no-verify' },
              ],
            },
          ],
        },
      }),
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test.each([
    '${DEVIN_PROJECT_DIR}/.devin/hooks/guard.py',
    '$DEVIN_PROJECT_DIR/.devin/hooks/guard.py',
    '$DEVIN_PROJECT_DIR\\.devin\\hooks\\guard.py',
  ])('HKS-05 resolves a Devin project path when the script exists: %s', async (command) => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({ PreToolUse: devinCommand(command) }),
      '.devin/hooks/guard.py': '# present',
    });
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('HKS-05 resolves canonical Devin os.path.join commands without executing Python', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({
        PreToolUse: devinCommand(devinPythonCommand('guard.py')),
      }),
      '.devin/hooks/guard.py': '# present',
    });
    const outcome = (await check('HKS-05')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('1 repository path reference');
  });

  test('HKS-05 fails when a canonical Devin os.path.join script is absent', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({
        PreToolUse: devinCommand(devinPythonCommand('missing.py')),
      }),
    });
    const outcome = (await check('HKS-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.evidence).toContain('.devin/hooks/missing.py');
  });

  test('HKS-05 ignores lookalike Devin os.path.join identifiers', async () => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({
        PreToolUse: devinCommand(
          `python -c "not_os.path.join(os.environ['DEVIN_PROJECT_DIR'], '.devin', 'hooks', 'missing.py')"`,
        ),
      }),
    });
    const outcome = (await check('HKS-05')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('nothing to resolve');
  });

  test.each(['PreToolUse', 'PermissionRequest'])('HKS-03 treats Devin %s as a gate', async (event) => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({ [event]: devinCommand() }),
    });
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
  });

  test.each(['PostToolUse', 'Stop'])('HKS-04 treats Devin %s as feedback', async (event) => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({ [event]: devinCommand() }),
    });
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
  });

  test.each([
    'PostCompaction',
    'UserPromptSubmit',
    'SessionStart',
    'SessionEnd',
  ])('does not treat Devin %s as a gate or feedback event', async (event) => {
    const ctx = fakeContext({
      '.devin/hooks.v1.json': JSON.stringify({ [event]: devinCommand() }),
    });
    expect((await check('HKS-03')).run(ctx).passed).toBe(false);
    expect((await check('HKS-04')).run(ctx).passed).toBe(false);
  });

  test('HKS-03 fails with no gate hook registered', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({ version: 1, hooks: { afterFileEdit: [{ command: 'x' }] } }),
    });
    expect((await check('HKS-03')).run(ctx).passed).toBe(false);
  });

  test('HKS-03 passes with a beforeShellExecution gate hook', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'x' }] },
      }),
    });
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
  });

  test('HKS-04 fails with no feedback hook registered', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: { beforeShellExecution: [{ command: 'x' }] },
      }),
    });
    expect((await check('HKS-04')).run(ctx).passed).toBe(false);
  });

  test('HKS-04 passes with an afterFileEdit feedback hook', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({ version: 1, hooks: { afterFileEdit: [{ command: 'x' }] } }),
    });
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
  });

  test('HKS-01 passes with Claude Code settings.json hooks', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'x' }] }] },
      }),
    });
    expect((await check('HKS-01')).run(ctx).passed).toBe(true);
  });

  test('HKS-03 passes with Claude Code PreToolUse gate hook', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'x' }] }] },
      }),
    });
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
  });

  test('HKS-04 passes with Claude Code PostToolUse feedback hook', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'x' }] }],
          PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'y' }] }],
        },
      }),
    });
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
  });
});

describe('ci checks', () => {
  test('CI-01 fails with no CI configuration', async () => {
    const ctx = fakeContext({});
    expect((await check('CI-01')).run(ctx).passed).toBe(false);
  });

  test('CI-01 passes with a GitHub Actions workflow', async () => {
    const ctx = fakeContext({ '.github/workflows/ci.yml': 'run: npm test' });
    expect((await check('CI-01')).run(ctx).passed).toBe(true);
  });

  test('CI-01, CI-02, and CI-03 recognize a Forgejo Actions workflow', async () => {
    const file = '.forgejo/workflows/verify.yaml';
    const ctx = fakeContext({ [file]: 'run: pnpm test\nrun: pnpm lint' });

    expect((await check('CI-01')).run(ctx)).toMatchObject({
      passed: true,
      evidence: `Found: ${file}.`,
    });
    expect((await check('CI-02')).run(ctx).passed).toBe(true);
    expect((await check('CI-03')).run(ctx).passed).toBe(true);
  });

  test('CI-01 passes with a root Jenkinsfile', async () => {
    const ctx = fakeContext({ Jenkinsfile: 'pipeline { agent any }' });
    expect((await check('CI-01')).run(ctx).passed).toBe(true);
  });

  test('CI-01 de-duplicates files that match multiple provider patterns', async () => {
    const file = '.github/workflows/bitbucket-pipelines.yml';
    const ctx = fakeContext({ [file]: 'run: npm test' });
    const outcome = (await check('CI-01')).run(ctx);

    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toBe(`Found: ${file}.`);
  });

  // Workspace layout: the harness lives in a control repo at the root and each
  // code repo is a subfolder with its own pipeline file. GitHub Actions already
  // matched at depth; the other providers did not.
  test('CI-01 detects non-GitHub CI files below the scan root', async () => {
    for (const file of [
      'backend/Jenkinsfile',
      'services/api/.gitlab-ci.yml',
      'apps/web/azure-pipelines.yml',
      'packages/cli/.circleci/config.yml',
      'infra/bitbucket-pipelines.yml',
    ]) {
      const ctx = fakeContext({ [file]: 'sh "npm test"' });
      expect((await check('CI-01')).run(ctx).passed, file).toBe(true);
    }
  });

  test('CI-02 and CI-03 inspect a nested pipeline file', async () => {
    const ctx = fakeContext({ 'backend/Jenkinsfile': 'sh "npm test"\nsh "npm run lint"' });
    expect((await check('CI-02')).run(ctx).passed).toBe(true);
    expect((await check('CI-03')).run(ctx).passed).toBe(true);
  });

  test('CI-01 detects cloudbuild/**/*.yml and reports its path', async () => {
    const file = 'cloudbuild/test/test.yml';
    const ctx = fakeContext({ [file]: 'steps:\n  - name: node:20\n    args: ["test"]' });
    const outcome = (await check('CI-01')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toBe(`Found: ${file}.`);
  });

  test('CI-01 detects cloudbuild/**/*.yaml only (not arbitrary YAML)', async () => {
    const cloudbuild = fakeContext({ 'cloudbuild/prod/pipeline.yaml': 'steps: []' });
    expect((await check('CI-01')).run(cloudbuild).passed).toBe(true);

    const nonCiYaml = fakeContext({ 'docs/cloudbuild.yaml': 'steps: []' });
    expect((await check('CI-01')).run(nonCiYaml).passed).toBe(false);
  });

  test('CI-02 recognizes npm test and npm run test in Cloud Build', async () => {
    const npmTest = fakeContext({
      'cloudbuild/test/test.yml': 'steps:\n  - args: ["test"]\n    entrypoint: npm',
    });
    expect((await check('CI-02')).run(npmTest).passed).toBe(true);

    const npmRunTest = fakeContext({
      'cloudbuild/test/test.yml': 'steps:\n  - args: ["run", "test"]\n    entrypoint: npm',
    });
    expect((await check('CI-02')).run(npmRunTest).passed).toBe(true);
  });

  test('CI-03 recognizes npm run lint and npm run type-check in Cloud Build', async () => {
    const ctx = fakeContext({
      'cloudbuild/test/test.yml':
        'steps:\n  - args: ["run", "lint"]\n    entrypoint: npm\n  - args: ["run", "type-check"]\n    entrypoint: npm',
    });
    expect((await check('CI-03')).run(ctx).passed).toBe(true);
  });

  test('CI-01 does not match a filename that merely ends with a CI file name', async () => {
    const ctx = fakeContext({ 'docs/not-a-Jenkinsfile': 'x', 'docs/Jenkinsfile.md': 'x' });
    expect((await check('CI-01')).run(ctx).passed).toBe(false);
  });

  test('CI-02 recognizes turbo/nx/pnpm-filter monorepo test invocations', async () => {
    const turbo = fakeContext({ '.github/workflows/ci.yml': 'run: turbo run test' });
    expect((await check('CI-02')).run(turbo).passed).toBe(true);

    const pnpmFilter = fakeContext({ '.github/workflows/ci.yml': 'run: pnpm --filter api test' });
    expect((await check('CI-02')).run(pnpmFilter).passed).toBe(true);
  });

  test('CI-02 does not match "test" inside unrelated words', async () => {
    const ctx = fakeContext({ '.github/workflows/ci.yml': 'run: echo "latest build attestation"' });
    expect((await check('CI-02')).run(ctx).passed).toBe(false);
  });

  test('CI-03 fails when CI does not run lint/typecheck', async () => {
    const ctx = fakeContext({ '.github/workflows/ci.yml': 'run: npm test' });
    expect((await check('CI-03')).run(ctx).passed).toBe(false);
  });

  test('CI-03 passes when CI runs eslint/tsc', async () => {
    const ctx = fakeContext({ '.github/workflows/ci.yml': 'run: npx eslint .' });
    expect((await check('CI-03')).run(ctx).passed).toBe(true);
  });

  test('CI-03 recognizes Astral ty check, including uv runners and quotes', async () => {
    for (const run of ['ty check', 'uv run ty check', 'uvx ty check', 'uvx ty@0.0.18 check', '"ty check"']) {
      const ctx = fakeContext({ '.github/workflows/ci.yml': `run: ${run}` });
      expect((await check('CI-03')).run(ctx).passed, run).toBe(true);
    }
  });

  test('CI-03 does not pass when CI only mentions ty without running it', async () => {
    const ctx = fakeContext({ '.github/workflows/ci.yml': 'run: echo "install ty later"' });
    expect((await check('CI-03')).run(ctx).passed).toBe(false);
  });

  test('CI-03 resolves Portuguese composer script names to phpstan/pint commands', async () => {
    const composer = JSON.stringify({
      scripts: {
        analise: 'vendor/bin/phpstan analyse',
        estilo: 'vendor/bin/pint',
        teste: 'vendor/bin/pest',
      },
    });
    const ciPhpstan = fakeContext({
      'composer.json': composer,
      '.github/workflows/ci.yml': 'run: composer analise',
    });
    expect((await check('CI-03')).run(ciPhpstan).passed).toBe(true);

    const ciPint = fakeContext({
      'composer.json': composer,
      '.github/workflows/ci.yml': 'run: composer estilo',
    });
    expect((await check('CI-03')).run(ciPint).passed).toBe(true);
  });

  test('CI-02 resolves composer teste script to pest', async () => {
    const ctx = fakeContext({
      'composer.json': JSON.stringify({ scripts: { teste: 'vendor/bin/pest' } }),
      '.github/workflows/ci.yml': 'run: composer teste',
    });
    expect((await check('CI-02')).run(ctx).passed).toBe(true);
  });

  test('CI-03 does not pass when CI only invokes a pest composer script', async () => {
    const ctx = fakeContext({
      'composer.json': JSON.stringify({ scripts: { teste: 'vendor/bin/pest' } }),
      '.github/workflows/ci.yml': 'run: composer teste',
    });
    expect((await check('CI-03')).run(ctx).passed).toBe(false);
  });

  test('CI-04 fails with no pre-commit tooling', async () => {
    const ctx = fakeContext({ 'package.json': JSON.stringify({}) });
    expect((await check('CI-04')).run(ctx).passed).toBe(false);
  });

  test('CI-04 passes with a .husky/ directory', async () => {
    const ctx = fakeContext({ '.husky/pre-commit': 'npm test' });
    expect((await check('CI-04')).run(ctx).passed).toBe(true);
  });
});

describe('hygiene checks', () => {
  test('HYG-01 fails with no .gitignore', async () => {
    const ctx = fakeContext({});
    expect((await check('HYG-01')).run(ctx).passed).toBe(false);
  });

  test('HYG-01 passes with a .gitignore', async () => {
    const ctx = fakeContext({ '.gitignore': 'node_modules/\n' });
    expect((await check('HYG-01')).run(ctx).passed).toBe(true);
  });

  test('HYG-02 fails when .gitignore has no .env pattern', async () => {
    const ctx = fakeContext({ '.gitignore': 'node_modules/\n' });
    expect((await check('HYG-02')).run(ctx).passed).toBe(false);
  });

  test('HYG-02 passes when .gitignore covers .env', async () => {
    const ctx = fakeContext({ '.gitignore': 'node_modules/\n.env\n' });
    expect((await check('HYG-02')).run(ctx).passed).toBe(true);
  });

  test('HYG-03 fails on an unignored .env', async () => {
    const ctx = fakeContext({ '.env': 'API_KEY=oops', '.gitignore': 'node_modules/\n' });
    expect((await check('HYG-03')).run(ctx).passed).toBe(false);
  });

  test('HYG-03 accepts .env.example', async () => {
    const ctx = fakeContext({ '.env.example': 'API_KEY=' });
    expect((await check('HYG-03')).run(ctx).passed).toBe(true);
  });

  test('HYG-04 detects an inlined API key in mcp.json', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { API_KEY: 'sk-abcdefghijklmnopqrstuvwx1234' } } },
      }),
    });
    const outcome = (await check('HYG-04')).run(ctx);
    expect(outcome.passed).toBe(false);
  });

  test('HYG-04 accepts env interpolation', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { API_KEY: '${MY_API_KEY}' } } },
      }),
    });
    expect((await check('HYG-04')).run(ctx).passed).toBe(true);
  });

  test('HYG-08 is not applicable when there is no mcp.json', async () => {
    const ctx = fakeContext({});
    const outcome = (await check('HYG-08')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).toBe(false);
    expect(outcome.evidence).toContain('does not apply');
  });

  test('HYG-08 fails on a literal credential-shaped value', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { API_TOKEN: 'literal-value-not-interpolated' } } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(false);
  });

  test('HYG-08 passes when credential-shaped values use ${VAR} interpolation', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { API_TOKEN: '${SVC_API_TOKEN}' } } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });

  test('HYG-08 passes with Claude Code .mcp.json path', async () => {
    const ctx = fakeContext({
      '.mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { API_TOKEN: '${SVC_API_TOKEN}' } } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });

  test('HYG-08 passes when mcp.json has no credential-shaped fields at all', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { command: 'npx', args: ['-y', '@example/mcp-server'] } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });

  test('HYG-08 fails on a literal secret hidden inside an array under a credential-shaped key', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { apiKeys: ['literal-one', 'literal-two'] } } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(false);
  });

  test('HYG-08 fails on a numeric/boolean credential-shaped value', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { env: { password: 123456 } } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(false);
  });

  test('HYG-08 does not flag benign fields that merely contain "key"/"auth" as substrings', async () => {
    const ctx = fakeContext({
      '.cursor/mcp.json': JSON.stringify({
        mcpServers: { svc: { authorName: 'Jane Doe', keyword: 'search', command: 'npx' } },
      }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });

  test('HYG-08 reports invalid JSON only for content that actually fails to parse', async () => {
    const invalid = fakeContext({ '.cursor/mcp.json': '{ not json' });
    const outcome = (await check('HYG-08')).run(invalid);
    expect(outcome.passed).toBe(false);
    expect(outcome.evidence).toContain('not valid JSON');
  });

  test('HYG-05 fails with no LICENSE file', async () => {
    const ctx = fakeContext({});
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).not.toBe(false);
  });

  test('HYG-05 passes with a LICENSE file', async () => {
    const ctx = fakeContext({ LICENSE: 'MIT' });
    expect((await check('HYG-05')).run(ctx).passed).toBe(true);
  });

  test.each([
    ['composer.json', { license: 'proprietary' }, 'composer.json declares license "proprietary"'],
    ['composer.json', { license: 'UNLICENSED' }, 'composer.json declares license "UNLICENSED"'],
    [
      'composer.json',
      { license: ['proprietary', 'UNLICENSED'] },
      'composer.json declares license ["proprietary","UNLICENSED"]',
    ],
    ['package.json', { license: 'UNLICENSED' }, 'package.json declares license "UNLICENSED"'],
    ['package.json', { license: 'Proprietary' }, 'package.json declares license "Proprietary"'],
  ])('HYG-05 is not applicable when root %s declares a closed-source license', async (file, manifest, evidence) => {
    const ctx = fakeContext({ [file]: JSON.stringify(manifest) });
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).toBe(false);
    expect(outcome.evidence).toBe(`${evidence}; HYG-05 does not apply.`);
  });

  test('HYG-05 still fails when package.json is private without a closed-source license', async () => {
    const ctx = fakeContext({ 'package.json': JSON.stringify({ private: true }) });
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).not.toBe(false);
    expect(outcome.evidence).toBe('No LICENSE file at repository root.');
  });

  test('HYG-05 still fails when the license is an SPDX id and no LICENSE file exists', async () => {
    const ctx = fakeContext({ 'package.json': JSON.stringify({ license: 'MIT' }) });
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).not.toBe(false);
  });

  test('HYG-05 still fails when a composer license array mixes proprietary with an SPDX id', async () => {
    const ctx = fakeContext({ 'composer.json': JSON.stringify({ license: ['MIT', 'proprietary'] }) });
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).not.toBe(false);
  });

  test('HYG-05 still fails when only a nested composer.json is proprietary', async () => {
    const ctx = fakeContext({ 'packages/app/composer.json': JSON.stringify({ license: 'proprietary' }) });
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.applicable).not.toBe(false);
  });

  test('HYG-05 passes when a LICENSE file exists beside a proprietary declaration', async () => {
    const ctx = fakeContext({
      LICENSE: 'Proprietary',
      'composer.json': JSON.stringify({ license: 'proprietary' }),
    });
    const outcome = (await check('HYG-05')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.applicable).not.toBe(false);
  });

  test('HYG-06 fails when a harness file contains a credential signature', async () => {
    const ctx = fakeContext({ 'AGENTS.md': 'token: sk-abcdefghijklmnopqrstuvwx1234' });
    expect((await check('HYG-06')).run(ctx).passed).toBe(false);
  });

  test('HYG-06 passes with clean harness files', async () => {
    const ctx = fakeContext({ 'AGENTS.md': '# Project\nNo secrets here.' });
    expect((await check('HYG-06')).run(ctx).passed).toBe(true);
  });

  test('HYG-07 fails when a manifest exists but no lockfile is committed', async () => {
    const ctx = fakeContext({ 'package.json': JSON.stringify({ name: 'x' }) });
    expect((await check('HYG-07')).run(ctx).passed).toBe(false);
  });

  test('HYG-07 passes when the lockfile is committed', async () => {
    const ctx = fakeContext({
      'package.json': JSON.stringify({ name: 'x' }),
      'package-lock.json': '{}',
    });
    expect((await check('HYG-07')).run(ctx).passed).toBe(true);
  });
});

describe('agent checks', () => {
  test('AGT-01 fails when no subagents are defined', async () => {
    const ctx = fakeContext({});
    expect((await check('AGT-01')).run(ctx).passed).toBe(false);
  });

  test('AGT-01 passes with a Claude Code subagent', async () => {
    const ctx = fakeContext({ '.claude/agents/reviewer.md': '---\nname: r\ndescription: d\n---\n' });
    expect((await check('AGT-01')).run(ctx).passed).toBe(true);
  });

  test('AGT-02 rejects a subagent missing frontmatter', async () => {
    const ctx = fakeContext({ '.cursor/agents/reviewer.md': '# Reviewer\nNo frontmatter here.' });
    expect((await check('AGT-02')).run(ctx).passed).toBe(false);
  });

  test('AGT-02 passes a subagent with name and description', async () => {
    const ctx = fakeContext({
      '.cursor/agents/reviewer.md':
        '---\nname: reviewer\ndescription: Use when reviewing a diff.\n---\n\nBody.',
    });
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
  });
});

describe('sensor checks', () => {
  test('SNS-01 ignores npm default placeholder test script', async () => {
    const ctx = fakeContext({
      'package.json': JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
    });
    expect((await check('SNS-01')).run(ctx).passed).toBe(false);
  });

  test('SNS-03 auto-passes statically typed ecosystems', async () => {
    const ctx = fakeContext({ 'go.mod': 'module example.com/app\n' });
    const outcome = (await check('SNS-03')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('go');
  });

  test('SNS-02 fails with no linter configuration', async () => {
    const ctx = fakeContext({});
    expect((await check('SNS-02')).run(ctx).passed).toBe(false);
  });

  test('SNS-02 passes with an eslintrc', async () => {
    const ctx = fakeContext({ '.eslintrc.json': '{}' });
    expect((await check('SNS-02')).run(ctx).passed).toBe(true);
  });

  test('SNS-04 fails with no formatter configuration', async () => {
    const ctx = fakeContext({});
    expect((await check('SNS-04')).run(ctx).passed).toBe(false);
  });

  test('SNS-04 passes with a .prettierrc', async () => {
    const ctx = fakeContext({ '.prettierrc': '{}' });
    expect((await check('SNS-04')).run(ctx).passed).toBe(true);
  });

  test('SNS-05 fails with no test files', async () => {
    const ctx = fakeContext({});
    expect((await check('SNS-05')).run(ctx).passed).toBe(false);
  });

  test('SNS-05 passes with at least one test file', async () => {
    const ctx = fakeContext({ 'src/foo.test.ts': 'test stuff' });
    expect((await check('SNS-05')).run(ctx).passed).toBe(true);
  });

  test('SNS-01 passes with phpunit.xml (issue #72 Laravel case)', async () => {
    const ctx = fakeContext({
      'phpunit.xml': '<phpunit></phpunit>',
      'tests/FooTest.php': '<?php',
      'composer.json': '{}',
    });
    expect((await check('SNS-01')).run(ctx).passed).toBe(true);
    expect((await check('SNS-05')).run(ctx).passed).toBe(true);
  });

  test('SNS-01 fails with composer.json alone and no PHP test config', async () => {
    const ctx = fakeContext({ 'composer.json': '{}' });
    expect((await check('SNS-01')).run(ctx).passed).toBe(false);
  });

  test('SNS-03 recognizes Astral ty.toml and [tool.ty] tables, including nested projects', async () => {
    const rootToml = fakeContext({ 'ty.toml': '[rules]\n' });
    expect((await check('SNS-03')).run(rootToml).evidence).toContain('ty configuration');

    const nestedToml = fakeContext({ 'packages/api/ty.toml': '[rules]\n' });
    expect((await check('SNS-03')).run(nestedToml).passed).toBe(true);

    const rootTable = fakeContext({
      'pyproject.toml': '[tool.ty.rules]\nindex-out-of-bounds = "ignore"\n',
    });
    expect((await check('SNS-03')).run(rootTable).passed).toBe(true);

    const nestedTable = fakeContext({
      'packages/api/pyproject.toml': '[tool.ty.src]\ninclude = ["src"]\n',
    });
    expect((await check('SNS-03')).run(nestedTable).passed).toBe(true);

    const overrides = fakeContext({
      'pyproject.toml': '[[tool.ty.overrides]]\ninclude = ["tests"]\n',
    });
    expect((await check('SNS-03')).run(overrides).passed).toBe(true);
  });

  test('SNS-03 does not treat [tool.types] as Astral ty', async () => {
    const ctx = fakeContext({ 'pyproject.toml': '[tool.types]\npython-version = "3.12"\n' });
    const outcome = (await check('SNS-03')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.evidence).not.toContain('ty configuration');
  });

  test('SNS-03 passes with phpstan.neon.dist and reports level', async () => {
    const ctx = fakeContext({
      'composer.json': '{}',
      'phpstan.neon.dist': 'parameters:\n    level: 8\n',
    });
    const outcome = (await check('SNS-03')).run(ctx);
    expect(outcome.passed).toBe(true);
    expect(outcome.evidence).toContain('level: 8');
    expect((await check('SNS-02')).run(ctx).passed).toBe(false);
  });

  test('SNS-04 passes with pint.json or laravel/pint in composer require-dev', async () => {
    const withConfig = fakeContext({ 'pint.json': '{}' });
    expect((await check('SNS-04')).run(withConfig).passed).toBe(true);

    const withPackage = fakeContext({
      'composer.json': JSON.stringify({ 'require-dev': { 'laravel/pint': '^1.0' } }),
    });
    expect((await check('SNS-04')).run(withPackage).passed).toBe(true);
  });

  test('SNS-02 passes with phpcs.xml or rector.php', async () => {
    expect((await check('SNS-02')).run(fakeContext({ 'phpcs.xml': '<ruleset/>' })).passed).toBe(true);
    expect((await check('SNS-02')).run(fakeContext({ 'rector.php': '<?php' })).passed).toBe(true);
  });
});

describe('multi-harness equivalence regressions (field-tested)', () => {
  test('HKS: hook-less .claude/settings.json must not shadow a real .cursor/hooks.json', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({ permissions: { allow: ['Bash(go test:*)'] } }),
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: {
          beforeShellExecution: [{ command: 'node ./.cursor/hooks/guard.js' }],
          afterFileEdit: [{ command: 'node ./.cursor/hooks/fmt.js' }],
        },
      }),
      '.cursor/hooks/guard.js': 'ok',
      '.cursor/hooks/fmt.js': 'ok',
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('CTX-04: root-level .continue/rules/*.md without frontmatter still count as valid', async () => {
    const ctx = fakeContext({
      '.continue/rules/data.md': '- Prefer polars over pandas.',
      '.continue/rules/style.md': '- Type hints mandatory.',
    });
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
  });

  test('CTX-03/04/05: nested context files count as scoped rules', async () => {
    const ctx = fakeContext({
      'CLAUDE.md': '# Root context',
      'packages/api/CLAUDE.md': '# API guidance - Fastify plugins only.',
    });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
    expect((await check('CTX-05')).run(ctx).passed).toBe(true);
  });

  test('nested rules: root context files do NOT count as rules', async () => {
    const ctx = fakeContext({ 'AGENTS.md': '# Root only' });
    expect((await check('CTX-03')).run(ctx).passed).toBe(false);
  });

  test('CTX-01/03: .claude/CLAUDE.md is project guide, not scoped rules', async () => {
    const guide = `# Project\n\n## Overview\n${'line\n'.repeat(25)}## Conventions\nmore\n`;
    const ctx = fakeContext({ '.claude/CLAUDE.md': guide });
    expect((await check('CTX-01')).run(ctx).passed).toBe(true);
    expect((await check('CTX-02')).run(ctx).passed).toBe(true);
    expect((await check('CTX-03')).run(ctx).passed).toBe(false);
  });

  test('CTX-01/03: .claude/AGENTS.md is project guide, not scoped rules', async () => {
    const guide = `# Project\n\n## Overview\n${'line\n'.repeat(25)}## Conventions\nmore\n`;
    const ctx = fakeContext({ '.claude/AGENTS.md': guide });
    expect((await check('CTX-01')).run(ctx).passed).toBe(true);
    expect((await check('CTX-03')).run(ctx).passed).toBe(false);
  });

  test('CTX-03/04/05: .claude/rules with paths frontmatter (string)', async () => {
    const ctx = fakeContext({
      'AGENTS.md': '# Root',
      '.claude/rules/api.md': '---\npaths: src/**/*.ts\n---\n# API rules\n',
    });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
    expect((await check('CTX-05')).run(ctx).passed).toBe(true);
  });

  test('CTX-03/04/05: .claude/rules with paths frontmatter (YAML list)', async () => {
    const ctx = fakeContext({
      'AGENTS.md': '# Root',
      '.claude/rules/api.md': '---\npaths:\n  - "src/**/*.ts"\n---\n# API rules\n',
    });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
    expect((await check('CTX-05')).run(ctx).passed).toBe(true);
  });

  test('CTX-03/04/05: single always-on .claude/rules file still passes CTX-05', async () => {
    const ctx = fakeContext({
      'AGENTS.md': '# Root',
      '.claude/rules/global.md': '# Always-on team standards\n',
    });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
    expect((await check('CTX-05')).run(ctx).passed).toBe(true);
  });

  test('CTX-05: two always-on .claude/rules files fail scope check', async () => {
    const ctx = fakeContext({
      'AGENTS.md': '# Root',
      '.claude/rules/a.md': '# Rule A\n',
      '.claude/rules/b.md': '# Rule B\n',
    });
    expect((await check('CTX-05')).run(ctx).passed).toBe(false);
  });

  test('CTX-03/04/05: nested packages/api/AGENTS.md and CLAUDE.md still count as rules', async () => {
    const ctxAgents = fakeContext({
      'AGENTS.md': '# Root',
      'packages/api/AGENTS.md': '# API guidance\n',
    });
    expect((await check('CTX-03')).run(ctxAgents).passed).toBe(true);
    expect((await check('CTX-04')).run(ctxAgents).passed).toBe(true);
    expect((await check('CTX-05')).run(ctxAgents).passed).toBe(true);

    const ctxClaude = fakeContext({
      'CLAUDE.md': '# Root context',
      'packages/api/CLAUDE.md': '# API guidance - Fastify plugins only.',
    });
    expect((await check('CTX-03')).run(ctxClaude).passed).toBe(true);
    expect((await check('CTX-04')).run(ctxClaude).passed).toBe(true);
    expect((await check('CTX-05')).run(ctxClaude).passed).toBe(true);
  });
});

describe('every check has a direct test', () => {
  test("every ALL_CHECKS id appears at least once in check('...') calls in this file", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const self = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'checks.test.ts'),
      'utf8',
    );
    const missing = ALL_CHECKS.map((c) => c.id).filter((id) => !self.includes(`check('${id}')`));
    expect(missing).toEqual([]);
  });
});
