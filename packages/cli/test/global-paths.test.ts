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
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'planner.md'), '# Planner\n', 'utf8');

      const prevXdg = process.env.XDG_CONFIG_HOME;
      process.env.XDG_CONFIG_HOME = xdg;
      try {
        const overlay = buildUserOverlay();
        expect(overlay?.files.has('.opencode/agents/planner.md')).toBe(true);
      } finally {
        if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prevXdg;
      }
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

  test('returns null for a missing extra root path', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-repo-'));
    try {
      expect(buildExtraRootOverlay(repo, { id: 'missing', path: './definitely-not-here' })).toBeNull();
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
