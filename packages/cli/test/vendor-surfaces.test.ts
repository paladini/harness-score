import { describe, expect, test } from 'vitest';
import { detectHarnesses } from '../src/harness/collectors.js';
import { check, fakeContext } from './helpers.js';

const SKILL = '---\nname: review\ndescription: Use when reviewing a change before it is merged.\n---\n';

describe('1.6 multi-harness artifact registry', () => {
  test.each([
    ['windsurf', '.windsurf/skills/review/SKILL.md'],
    ['cline', '.cline/skills/review/SKILL.md'],
    ['copilot', '.github/skills/review/SKILL.md'],
    ['opencode', '.opencode/skills/review/SKILL.md'],
    ['gemini-cli', '.gemini/skills/review/SKILL.md'],
    ['kiro', '.kiro/skills/review/SKILL.md'],
    ['junie', '.junie/skills/review/SKILL.md'],
    ['roo-code', '.roo/skills/review/SKILL.md'],
    ['devin', '.cognition/skills/review/SKILL.md'],
  ])('recognizes %s native skills', async (toolId, path) => {
    const ctx = fakeContext({ [path]: SKILL });
    expect((await check('SKL-01')).run(ctx).passed).toBe(true);
    expect(detectHarnesses(ctx)).toContain(toolId);
  });

  test('shared Agent Skills score once without guessing a vendor', async () => {
    const ctx = fakeContext({ '.agents/skills/review/SKILL.md': SKILL });
    expect((await check('SKL-01')).run(ctx).passed).toBe(true);
    expect(detectHarnesses(ctx)).toEqual([]);
  });

  test.each([
    ['copilot', '.github/prompts/review.prompt.md'],
    ['gemini-cli', '.gemini/commands/review.toml'],
  ])('recognizes %s explicit commands', async (toolId, path) => {
    const ctx = fakeContext({ [path]: 'description = "Review the current diff"' });
    expect((await check('SKL-03')).run(ctx).passed).toBe(true);
    expect(detectHarnesses(ctx)).toContain(toolId);
  });

  test.each([
    ['claude-code', '.claude/rules/testing.md'],
    ['kiro', '.kiro/steering/testing.md'],
    ['junie', '.junie/AGENTS.md'],
    ['roo-code', '.roo/rules-testing/style.md'],
  ])('recognizes %s rule surfaces without mandatory frontmatter', async (toolId, path) => {
    const ctx = fakeContext({ [path]: '# Testing guidance' });
    expect((await check('CTX-03')).run(ctx).passed).toBe(true);
    expect((await check('CTX-04')).run(ctx).passed).toBe(true);
    expect(detectHarnesses(ctx)).toContain(toolId);
  });
});

describe('1.6 subagent formats', () => {
  test.each([
    ['copilot', '.github/agents/reviewer.md'],
    ['gemini-cli', '.gemini/agents/reviewer.md'],
    ['junie', '.junie/agents/reviewer.md'],
  ])('accepts %s markdown agents', async (toolId, path) => {
    const ctx = fakeContext({ [path]: SKILL });
    expect((await check('AGT-01')).run(ctx).passed).toBe(true);
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
    expect(detectHarnesses(ctx)).toContain(toolId);
  });

  test('accepts OpenCode filename identity with description frontmatter', async () => {
    const ctx = fakeContext({
      '.opencode/agents/reviewer.md': '---\ndescription: Reviews risky changes.\n---\n',
    });
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
  });

  test.each([
    ['copilot', '.github/agents/reviewer.md'],
    ['kiro', '.kiro/agents/team/reviewer.md'],
    ['junie', '.junie/agents/reviewer.md'],
  ])('accepts %s filename identity when name is omitted', async (_toolId, path) => {
    const ctx = fakeContext({ [path]: '---\ndescription: Reviews risky changes.\n---\n' });
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
  });

  test('accepts Kiro JSON agents', async () => {
    const ctx = fakeContext({
      '.kiro/agents/reviewer.json': JSON.stringify({ description: 'Reviews changes' }),
    });
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
  });

  test('accepts Roo Code custom modes', async () => {
    const ctx = fakeContext({
      '.roomodes': 'customModes:\n  - slug: reviewer\n    name: Reviewer\n    roleDefinition: Review code\n',
    });
    expect((await check('AGT-01')).run(ctx).passed).toBe(true);
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
  });

  test('accepts Junie shared agents without guessing the vendor', async () => {
    const ctx = fakeContext({ '.agents/reviewer.md': SKILL });
    expect((await check('AGT-01')).run(ctx).passed).toBe(true);
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
    expect(detectHarnesses(ctx)).toEqual([]);
  });
});

describe('1.6 vendor hook adapters', () => {
  test('applies OR semantics independently for each hook capability', async () => {
    const ctx = fakeContext({
      '.cursor/hooks.json': JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [{ command: 'echo one' }],
          sessionEnd: [{ command: 'echo two' }],
          afterAgentResponse: [{ command: 'echo three' }],
        },
      }),
      '.clinerules/hooks/PreToolUse': '#!/bin/sh',
    });
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('accepts modern Claude Code lifecycle events', async () => {
    const ctx = fakeContext({
      '.claude/settings.json': JSON.stringify({
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo start' }] }],
          InstructionsLoaded: [{ hooks: [{ type: 'command', command: 'echo loaded' }] }],
          PostToolUseFailure: [{ hooks: [{ type: 'command', command: 'echo failed' }] }],
        },
      }),
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
  });

  test('aggregates multiple Copilot hook files', async () => {
    const ctx = fakeContext({
      '.github/hooks/gate.json': JSON.stringify({
        version: 1,
        hooks: { preToolUse: [{ type: 'command', command: 'node .github/hooks/gate.js' }] },
      }),
      '.github/hooks/feedback.json': JSON.stringify({
        version: 1,
        hooks: { postToolUse: [{ type: 'command', command: 'node .github/hooks/feedback.js' }] },
      }),
      '.github/hooks/gate.js': '// gate',
      '.github/hooks/feedback.js': '// feedback',
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('accepts Windsurf hooks without a version field', async () => {
    const ctx = fakeContext({
      '.windsurf/hooks.json': JSON.stringify({
        hooks: {
          pre_run_command: [{ command: 'node .windsurf/hooks/gate.js' }],
          post_write_code: [{ command: 'node .windsurf/hooks/format.js' }],
        },
      }),
      '.windsurf/hooks/gate.js': '// gate',
      '.windsurf/hooks/format.js': '// format',
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
  });

  test('accepts Cline executable hook files', async () => {
    const ctx = fakeContext({
      '.clinerules/hooks/PreToolUse': '#!/bin/sh',
      '.clinerules/hooks/PostToolUse': '#!/bin/sh',
    });
    expect((await check('HKS-01')).run(ctx).passed).toBe(true);
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('accepts Gemini CLI settings hooks', async () => {
    const ctx = fakeContext({
      '.gemini/settings.json': JSON.stringify({
        hooks: {
          BeforeTool: [{ hooks: [{ type: 'command', command: 'node .gemini/hooks/gate.js' }] }],
          AfterTool: [{ hooks: [{ type: 'command', command: 'node .gemini/hooks/test.js' }] }],
        },
      }),
      '.gemini/hooks/gate.js': '// gate',
      '.gemini/hooks/test.js': '// test',
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
  });

  test('accepts Antigravity grouped hooks', async () => {
    const ctx = fakeContext({
      '.agents/hooks.json': JSON.stringify({
        gate: {
          pre_tool_execution: [
            { hooks: [{ type: 'command', command: 'python3 /.agents/hooks-scripts/gate.py' }] },
          ],
          post_tool_execution: [
            { hooks: [{ type: 'command', command: 'python3 /.agents/hooks-scripts/audit.py' }] },
          ],
        },
      }),
      '.agents/hooks-scripts/gate.py': '# gate',
      '.agents/hooks-scripts/audit.py': '# audit',
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });

  test('accepts Kiro v1 hook files', async () => {
    const ctx = fakeContext({
      '.kiro/hooks/guard.json': JSON.stringify({
        version: 'v1',
        hooks: [
          {
            name: 'guard',
            trigger: 'PreToolUse',
            action: { type: 'command', command: 'node .kiro/hooks/guard.js' },
          },
          {
            name: 'feedback',
            trigger: 'PostToolUse',
            action: { type: 'command', command: 'node .kiro/hooks/feedback.js' },
          },
        ],
      }),
      '.kiro/hooks/guard.js': '// gate',
      '.kiro/hooks/feedback.js': '// feedback',
    });
    expect((await check('HKS-02')).run(ctx).passed).toBe(true);
    expect((await check('HKS-03')).run(ctx).passed).toBe(true);
    expect((await check('HKS-04')).run(ctx).passed).toBe(true);
    expect((await check('HKS-05')).run(ctx).passed).toBe(true);
  });
});

describe('1.6 MCP formats', () => {
  test('accepts Continue YAML with env interpolation', async () => {
    const ctx = fakeContext({
      '.continue/mcpServers/search.yaml': 'name: search\nenv:\n  API_TOKEN: "${SEARCH_TOKEN}"\n',
    });
    expect((await check('HYG-04')).run(ctx).passed).toBe(true);
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });

  test('rejects literal credentials in Continue YAML', async () => {
    const ctx = fakeContext({
      '.continue/mcpServers/search.yaml': 'name: search\nenv:\n  API_TOKEN: literal-value\n',
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(false);
  });

  test('recognizes inline Continue mcpServers without treating unrelated config as MCP', async () => {
    const mcp = fakeContext({
      '.continue/config.yaml': 'mcpServers:\n  - name: search\n    env:\n      API_TOKEN: ${SEARCH_TOKEN}\n',
    });
    const unrelated = fakeContext({ '.continue/config.yaml': 'models: []\n' });
    expect((await check('HYG-08')).run(mcp).passed).toBe(true);
    expect((await check('HYG-08')).run(unrelated).passed).toBe(false);
  });

  test('does not mistake hook-only Gemini settings for MCP', async () => {
    const ctx = fakeContext({
      '.gemini/settings.json': JSON.stringify({ hooks: { BeforeTool: [] } }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(false);
  });

  test.each([
    '.gemini/settings.json',
    '.kiro/settings/mcp.json',
    '.roo/mcp.json',
  ])('accepts safe MCP config at %s', async (path) => {
    const ctx = fakeContext({
      [path]: JSON.stringify({ mcpServers: { search: { env: { API_TOKEN: '${SEARCH_TOKEN}' } } } }),
    });
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });

  test('accepts safe inline MCP configuration in a Kiro agent', async () => {
    const ctx = fakeContext({
      '.kiro/agents/team/backend.md':
        '---\ndescription: Backend agent\nmcpServers:\n  search:\n    env:\n      API_TOKEN: "${SEARCH_TOKEN}"\n---\nSystem prompt.\n',
    });
    expect((await check('AGT-02')).run(ctx).passed).toBe(true);
    expect((await check('HYG-08')).run(ctx).passed).toBe(true);
  });
});
