import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { ResolvedScanConfig } from '../src/config.js';
import { score } from '../src/index.js';
import { renderBadge } from '../src/report/badge.js';
import { buildReport, buildReportFromScanContext } from '../src/score.js';
import { fakeContext } from './helpers.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');

describe('not-applicable hygiene checks leave the denominator', () => {
  test('a proprietary repo with no MCP config drops HYG-05 and HYG-08 from the score', () => {
    const ctx = fakeContext({
      'composer.json': JSON.stringify({ license: 'proprietary' }),
      '.gitignore': '.env\n',
    });
    const report = buildReportFromScanContext(ctx);
    const hyg05 = report.checks.find((check) => check.id === 'HYG-05')!;
    const hyg08 = report.checks.find((check) => check.id === 'HYG-08')!;
    expect(hyg05.applicable).toBe(false);
    expect(hyg05.passed).toBe(false);
    expect(hyg05.earned).toBe(0);
    expect(hyg08.applicable).toBe(false);
    expect(hyg08.earned).toBe(0);

    const hygiene = report.dimensions.find((dimension) => dimension.id === 'hygiene')!;
    const scored = report.checks.filter(
      (check) => check.dimension === 'hygiene' && check.applicable && check.severity !== 'off',
    );
    expect(hygiene.max).toBe(scored.reduce((sum, check) => sum + check.points, 0));
    expect(hygiene.max).toBe(23 - hyg05.points - hyg08.points);
    const scoredPoints = report.checks
      .filter((check) => check.applicable && check.severity !== 'off')
      .reduce((sum, check) => sum + check.points, 0);
    expect(report.score.max).toBe(scoredPoints);
    const failingIds = report.checks
      .filter((check) => !check.passed && check.applicable)
      .map((check) => check.id);
    expect(failingIds).not.toContain('HYG-05');
    expect(failingIds).not.toContain('HYG-08');
  });
});

describe('dimension roll-up (score.ts aggregating checks/*.ts output)', () => {
  test('a partial pass within the skills dimension rolls up to the exact expected fraction', () => {
    // Only SKL-01 can pass here: a SKILL.md with no frontmatter and no
    // commands/subagents present, so SKL-02/03/04 and AGT-01/02 all fail.
    const ctx = fakeContext({ '.cursor/skills/deploy/SKILL.md': '# Deploy\nNo frontmatter here.' });
    const report = buildReportFromScanContext(ctx);
    const skills = report.dimensions.find((d) => d.id === 'skills')!;

    const skillsChecks = report.checks.filter((c) => c.dimension === 'skills');
    const expectedMax = skillsChecks.reduce((sum, c) => sum + c.points, 0);
    const expectedEarned = skillsChecks.find((c) => c.id === 'SKL-01')!.points;

    expect(skills.max).toBe(expectedMax);
    expect(skills.earned).toBe(expectedEarned);
    expect(skills.percent).toBe(Math.round((expectedEarned / expectedMax) * 100));
    expect(report.checks.find((c) => c.id === 'SKL-01')!.passed).toBe(true);
    expect(report.checks.find((c) => c.id === 'SKL-02')!.passed).toBe(false);
    expect(report.checks.find((c) => c.id === 'SKL-03')!.passed).toBe(false);
    expect(report.checks.find((c) => c.id === 'AGT-01')!.passed).toBe(false);
  });
});

describe('badge pipeline integrates with score() across all fixture levels', () => {
  test.each([
    ['level-0', 0],
    ['level-1', 1],
    ['level-2', 2],
    ['level-3', 3],
    ['level-4', 4],
  ])('%s → renderBadge(score(...)) embeds L%i', (fixture, expected) => {
    const svg = renderBadge(score(path.join(FIXTURES, fixture)));
    expect(svg).toContain(`>L${expected}<`);
  });
});

describe('no-hooks preset against fixtures/level-4', () => {
  test('excludes hooks without penalizing other dimensions, and caps the level honestly', () => {
    const root = path.join(FIXTURES, 'level-4');
    const baseline = buildReport(root);

    // Sanity-check the fixture still means what the rest of the suite assumes.
    expect(baseline.level.index).toBe(4);
    expect(baseline.level.capped).toBe(false);

    const presetConfig: ResolvedScanConfig = {
      scopes: { user: false, system: false },
      extraRoots: [],
      gate: 'maturity',
      effectiveScopes: ['repo'],
      extends: ['no-hooks'],
      rules: {},
    };
    const withPreset = buildReport(root, presetConfig);

    const hooksDim = withPreset.dimensions.find((d) => d.id === 'hooks')!;
    expect(hooksDim.applicable).toBe(false);
    expect(hooksDim.earned).toBe(0);
    expect(hooksDim.max).toBe(0);

    // Every other dimension is untouched — excluding hooks never bleeds into the rest.
    for (const id of ['context', 'skills', 'sensors', 'ci', 'hygiene'] as const) {
      const before = baseline.dimensions.find((d) => d.id === id)!;
      const after = withPreset.dimensions.find((d) => d.id === id)!;
      expect(after.earned).toBe(before.earned);
      expect(after.max).toBe(before.max);
    }

    expect(withPreset.score.max).toBe(baseline.score.max - 14);

    // The strongest proof of the mechanism: even if the reduced-pool percent clears 80%,
    // L4 stays capped — hooks is definitional to "self-correcting", not just another gap.
    expect(withPreset.level.index).toBeLessThanOrEqual(3);
    expect(withPreset.level.capped).toBe(true);
    expect(withPreset.level.capReason).toMatch(/hooks/);

    expect(withPreset.preset.extends).toEqual(['no-hooks']);
    expect(withPreset.preset.resolved).toHaveLength(5); // HKS-01..05
    expect(
      withPreset.preset.resolved.every((r) => r.severity === 'off' && r.source === 'extends:no-hooks'),
    ).toBe(true);
  });
});
