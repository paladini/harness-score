import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { score } from '../src/index.js';
import { renderBadge } from '../src/report/badge.js';
import { buildReport } from '../src/score.js';
import { fakeContext } from './helpers.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');

describe('dimension roll-up (score.ts aggregating checks/*.ts output)', () => {
  test('a partial pass within the skills dimension rolls up to the exact expected fraction', () => {
    // Only SKL-01 can pass here: a SKILL.md with no frontmatter and no
    // commands/subagents present, so SKL-02/03/04 and AGT-01/02 all fail.
    const ctx = fakeContext({ '.cursor/skills/deploy/SKILL.md': '# Deploy\nNo frontmatter here.' });
    const report = buildReport(ctx);
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
