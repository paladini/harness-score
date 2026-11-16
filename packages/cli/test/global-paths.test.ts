import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildExtraRootOverlay,
  buildOverlays,
  buildSystemOverlay,
  buildUserOverlay,
} from '../src/harness/global-paths.js';

function withTempHome(run: (home: string) => void): void {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-home-'));
  const prevHome = process.env.HOME;
  const prevUserProfile = process.env.USERPROFILE;
  process.env.HOME = tmpHome;
  process.env.USERPROFILE = tmpHome;
  try {
    run(tmpHome);
  } finally {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (prevUserProfile === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = prevUserProfile;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
}

describe('buildUserOverlay', () => {
  test('returns null when home has no harness artifacts', () => {
    withTempHome(() => {
      expect(buildUserOverlay()).toBeNull();
    });
  });

  test('collects cursor skills and single-file configs from home', () => {
    withTempHome((home) => {
      const skillDir = path.join(home, '.cursor', 'skills', 'deploy');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: deploy\ndescription: Deploy\n---\n# Deploy\n',
        'utf8',
      );
      fs.mkdirSync(path.join(home, '.cursor'), { recursive: true });
      fs.writeFileSync(path.join(home, '.cursor', 'mcp.json'), '{}', 'utf8');

      const overlay = buildUserOverlay();
      expect(overlay?.label).toBe('user');
      expect(overlay?.files.get('.cursor/skills/deploy/SKILL.md')).toContain('SKILL.md');
      expect(overlay?.files.get('.cursor/mcp.json')).toContain('mcp.json');
    });
  });

  test('uses XDG_CONFIG_HOME for opencode agents', () => {
    withTempHome((home) => {
      const xdg = path.join(home, 'xdg-config');
      const agentDir = path.join(xdg, 'opencode', 'agents');
      const skillDir = path.join(xdg, 'opencode', 'skills', 'deploy');
      const commandDir = path.join(xdg, 'opencode', 'commands');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.mkdirSync(skillDir, { recursive: true });
      fs.mkdirSync(commandDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'planner.md'), '# Planner\n', 'utf8');
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Deploy\n', 'utf8');
      fs.writeFileSync(path.join(commandDir, 'release.md'), '# Release\n', 'utf8');

      const prevXdg = process.env.XDG_CONFIG_HOME;
      process.env.XDG_CONFIG_HOME = xdg;
      try {
        const overlay = buildUserOverlay();
        expect(overlay?.files.has('.opencode/agents/planner.md')).toBe(true);
        expect(overlay?.files.has('.opencode/skills/deploy/SKILL.md')).toBe(true);
        expect(overlay?.files.has('.opencode/commands/release.md')).toBe(true);
      } finally {
        if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prevXdg;
      }
    });
  });

  test('maps Windsurf global_rules.md to .windsurf/rules/ for checks', () => {
    withTempHome((home) => {
      const globalRules = path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md');
      fs.mkdirSync(path.dirname(globalRules), { recursive: true });
      fs.writeFileSync(globalRules, '# Global Windsurf rules\n', 'utf8');

      const overlay = buildUserOverlay();
      expect(overlay?.files.get('.windsurf/rules/global_rules.md')).toBe(globalRules);
    });
  });

  test('collects Continue and Zed user-level harness dirs', () => {
    withTempHome((home) => {
      fs.mkdirSync(path.join(home, '.continue', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(home, '.continue', 'rules', 'style.md'), '# Style\n', 'utf8');
      fs.mkdirSync(path.join(home, '.zed', 'commands'), { recursive: true });
      fs.writeFileSync(path.join(home, '.zed', 'commands', 'review.md'), '# Review\n', 'utf8');

      const overlay = buildUserOverlay();
      expect(overlay?.files.has('.continue/rules/style.md')).toBe(true);
      expect(overlay?.files.has('.zed/commands/review.md')).toBe(true);
    });
  });

  test('collects Copilot, Cline, Devin, and Zed official global locations', () => {
    withTempHome((home) => {
      const xdg = path.join(home, 'xdg-config');
      const prevXdg = process.env.XDG_CONFIG_HOME;
      const prevAppData = process.env.APPDATA;
      process.env.XDG_CONFIG_HOME = xdg;
      process.env.APPDATA = path.join(home, 'appdata');
      try {
        const copilotSkill = path.join(home, '.copilot', 'skills', 'review', 'SKILL.md');
        const clineSkill = path.join(home, '.cline', 'skills', 'review', 'SKILL.md');
        const clineRule = path.join(home, '.cline', 'rules', 'style.md');
        const copilotAgent = path.join(home, '.copilot', 'agents', 'reviewer.md');
        const devinSkill = path.join(xdg, 'devin', 'skills', 'release', 'SKILL.md');
        const devinRule = path.join(xdg, 'devin', 'rules', 'policy.md');
        const devinAgent = path.join(xdg, 'devin', 'agents', 'reviewer.md');
        const devinWorkflow = path.join(xdg, 'devin', 'workflows', 'review.md');
        const zedGuide = path.join(xdg, 'zed', 'AGENTS.md');
        const copilotHook = path.join(home, '.copilot', 'hooks', 'policy.json');
        const devinHooks = path.join(xdg, 'devin', 'hooks.v1.json');
        const devinMcp = path.join(xdg, 'devin', 'mcp_config.json');
        const opencodeConfig = path.join(xdg, 'opencode', 'opencode.jsonc');
        for (const file of [copilotSkill, copilotAgent, clineSkill, devinSkill, devinAgent, devinWorkflow]) {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, '# Skill\n', 'utf8');
        }
        for (const [file, content] of [
          [clineRule, '# Rule\n'],
          [devinRule, '# Rule\n'],
          [zedGuide, '# Instructions\n'],
          [copilotHook, '{"version":1,"hooks":{"preToolUse":[]}}'],
          [devinHooks, '{}'],
          [devinMcp, '{}'],
          [opencodeConfig, '{"mcp":{}}'],
        ]) {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, content, 'utf8');
        }

        const overlay = buildUserOverlay();
        expect(overlay?.files.has('.github/skills/review/SKILL.md')).toBe(true);
        expect(overlay?.files.has('.cline/skills/review/SKILL.md')).toBe(true);
        expect(overlay?.files.has('.cline/rules/style.md')).toBe(true);
        expect(overlay?.files.has('.devin/skills/release/SKILL.md')).toBe(true);
        expect(overlay?.files.has('.devin/rules/policy.md')).toBe(true);
        expect(overlay?.files.has('.github/hooks/policy.json')).toBe(true);
        expect(overlay?.files.has('.github/agents/reviewer.md')).toBe(true);
        expect(overlay?.files.has('.devin/agents/reviewer.md')).toBe(true);
        expect(overlay?.files.has('.devin/workflows/review.md')).toBe(true);
        expect(overlay?.files.has('.devin/hooks.v1.json')).toBe(true);
        expect(overlay?.files.has('.devin/mcp_config.json')).toBe(true);
        expect(overlay?.files.has('opencode.jsonc')).toBe(true);
        expect(overlay?.files.has('AGENTS.md')).toBe(true);
        expect(overlay?.files.get('AGENTS.md')).toBe(zedGuide);
      } finally {
        if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prevXdg;
        if (prevAppData === undefined) delete process.env.APPDATA;
        else process.env.APPDATA = prevAppData;
      }
    });
  });

  test('maps Cline global rules from Documents/Cline/Rules to .clinerules/', () => {
    withTempHome((home) => {
      const rulesDir = path.join(home, 'Documents', 'Cline', 'Rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'preferences.md'), '# Preferences\n', 'utf8');

      const overlay = buildUserOverlay();
      expect(overlay?.files.has('.clinerules/preferences.md')).toBe(true);
    });
  });

  test('collects Antigravity user-level rules and workflows', () => {
    withTempHome((home) => {
      fs.mkdirSync(path.join(home, '.agents', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(home, '.agents', 'rules', 'core'), '# Core\n', 'utf8');
      fs.mkdirSync(path.join(home, '.agents', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(home, '.agents', 'workflows', 'release.md'), '# Release\n', 'utf8');

      const overlay = buildUserOverlay();
      expect(overlay?.files.has('.agents/rules/core')).toBe(true);
      expect(overlay?.files.has('.agents/workflows/release.md')).toBe(true);
    });
  });
});

describe('buildExtraRootOverlay', () => {
  test('collects harness tree from a directory extra root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-extra-'));
    const skillDir = path.join(dir, '.cursor', 'skills', 'shared');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: shared\ndescription: Shared\n---\n# Shared\n',
      'utf8',
    );

    try {
      const overlay = buildExtraRootOverlay(dir, { id: 'team', path: '.' });
      expect(overlay?.label).toBe('team');
      expect(overlay?.files.has('.cursor/skills/shared/SKILL.md')).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('collects a single AGENTS.md file extra root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-extra-'));
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Agents\n', 'utf8');

    try {
      const overlay = buildExtraRootOverlay(dir, { id: 'shared', path: '.' });
      expect(overlay?.files.has('AGENTS.md')).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('reports a deterministic depth-limit reason for an incomplete extra root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-extra-'));
    let nested = dir;
    for (let depth = 0; depth < 10; depth += 1) {
      nested = path.join(nested, `d${depth}`);
      fs.mkdirSync(nested);
    }
    fs.writeFileSync(path.join(nested, 'AGENTS.md'), '# Too deep\n', 'utf8');

    try {
      const overlay = buildExtraRootOverlay(dir, { id: 'deep', path: '.' });
      expect(overlay?.truncated).toBe(true);
      expect(overlay?.incompleteReasons).toEqual([
        {
          code: 'depth-limit',
          path: 'd0/d1/d2/d3/d4/d5/d6/d7/d8',
          limit: 8,
        },
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('fails closed for a missing configured extra root path', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-repo-'));
    try {
      expect(buildExtraRootOverlay(repo, { id: 'missing', path: './definitely-not-here' })).toMatchObject({
        label: 'missing',
        truncated: true,
        incompleteReasons: [{ code: 'unreadable-directory', path: '.' }],
      });
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('buildOverlays', () => {
  test('adds user overlay and resolved root when user scope is enabled', () => {
    withTempHome((home) => {
      const skillDir = path.join(home, '.cursor', 'skills', 'x');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Skill\n', 'utf8');

      const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-repo-'));
      try {
        const { overlays, resolvedRoots } = buildOverlays(repo, { user: true, system: false }, []);
        expect(overlays).toHaveLength(1);
        expect(overlays[0]?.label).toBe('user');
        expect(resolvedRoots[0]?.scope).toBe('user');
        expect(resolvedRoots[0]?.absPath).toBe(home);
      } finally {
        fs.rmSync(repo, { recursive: true, force: true });
      }
    });
  });

  test('system scope is reserved and adds no overlay in v1', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-repo-'));
    try {
      const { overlays, resolvedRoots } = buildOverlays(repo, { user: false, system: true }, []);
      expect(overlays).toEqual([]);
      expect(resolvedRoots).toEqual([]);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  test('extra roots merge into overlays and resolved roots', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-repo-'));
    const shared = path.join(repo, 'shared-harness');
    fs.mkdirSync(shared, { recursive: true });
    fs.writeFileSync(path.join(shared, 'AGENTS.md'), '# Shared agents\n', 'utf8');

    try {
      const { overlays, resolvedRoots } = buildOverlays(repo, { user: false, system: false }, [
        { id: 'team-shared', path: './shared-harness' },
      ]);
      expect(overlays).toHaveLength(1);
      expect(overlays[0]?.label).toBe('team-shared');
      expect(resolvedRoots[0]?.scope).toBe('team-shared');
      expect(resolvedRoots[0]?.absPath).toBe(path.resolve(repo, 'shared-harness'));
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('buildSystemOverlay', () => {
  test('returns null until system paths are validated', () => {
    expect(buildSystemOverlay()).toBeNull();
  });
});
