import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { score } from '../src/index.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');

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

describe('harness scopes and dual score', () => {
  test('repo-only scan: effective equals maturity', () => {
    const report = score(path.join(FIXTURES, 'level-2'));
    expect(report.scopes.maturity).toEqual(['repo']);
    expect(report.scopes.effective).toEqual(['repo']);
    expect(report.effective.level.index).toBe(report.level.index);
    expect(report.effective.score.percent).toBe(report.score.percent);
    expect(report.gate).toBe('maturity');
  });

  test('user scope can raise effective score above maturity', () => {
    withTempHome((home) => {
      const skillDir = path.join(home, '.cursor', 'skills', 'deploy');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: deploy\ndescription: Deploy skill\n---\n# Deploy\n',
        'utf8',
      );

      const report = score(path.join(FIXTURES, 'level-0'), { scopeFlags: ['user'] });
      expect(report.scopes.effective).toContain('user');
      expect(report.effective.score.earned).toBeGreaterThan(report.score.earned);
    });
  });

  test('repo files win over user overlay on path conflict', () => {
    withTempHome((home) => {
      const skillDir = path.join(home, '.cursor', 'skills', 'deploy');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Global only\n', 'utf8');

      const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-repo-'));
      const repoSkill = path.join(repoDir, '.cursor', 'skills', 'deploy');
      fs.mkdirSync(repoSkill, { recursive: true });
      fs.writeFileSync(
        path.join(repoSkill, 'SKILL.md'),
        '---\nname: deploy\ndescription: Repo skill\n---\n# Repo\n',
        'utf8',
      );

      try {
        const report = score(repoDir, { scopeFlags: ['user'] });
        const skl01 = report.effective.checks.find((c) => c.id === 'SKL-01')!;
        expect(skl01.passed).toBe(true);
        expect(skl01.evidence).toContain('.cursor/skills/deploy/SKILL.md');
      } finally {
        fs.rmSync(repoDir, { recursive: true, force: true });
      }
    });
  });
});
