import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/checks/index.js';
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
  test('HKS-01 fails on invalid JSON', async () => {
    const ctx = fakeContext({ '.cursor/hooks.json': '{ not json' });
    expect((await check('HKS-01')).run(ctx).passed).toBe(false);
  });

  test('HKS-02 flags unknown event names', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({ version: 1, hooks: { onFileSave: [{ command: 'x' }] } }),
    });
    const outcome = (await check('HKS-02')).run(ctx);
    expect(outcome.passed).toBe(false);
    expect(outcome.evidence).toContain('onFileSave');
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

  test('HYG-08 fails when there is no mcp.json', async () => {
    const ctx = fakeContext({});
    expect((await check('HYG-08')).run(ctx).passed).toBe(false);
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
    expect((await check('HYG-05')).run(ctx).passed).toBe(false);
  });

  test('HYG-05 passes with a LICENSE file', async () => {
    const ctx = fakeContext({ LICENSE: 'MIT' });
    expect((await check('HYG-05')).run(ctx).passed).toBe(true);
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
