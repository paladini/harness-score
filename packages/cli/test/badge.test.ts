import { describe, expect, test } from 'vitest';
import { renderBadge } from '../src/report/badge.js';
import type { Report } from '../src/types.js';

function makeReport(levelIndex: number): Report {
  return {
    tool: { name: 'harness-score', version: '0.3.0' },
    root: '/fake',
    truncated: false,
    level: { index: levelIndex, name: 'x', nextLevelGaps: [] },
    score: { earned: 0, max: 108, percent: 0 },
    dimensions: [],
    checks: [],
  };
}

describe('renderBadge', () => {
  test.each([0, 1, 2, 3, 4])('renders L%i in the value text, aria-label and title', (level) => {
    const svg = renderBadge(makeReport(level));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`>L${level}<`);
    expect(svg).toContain(`aria-label="Harness Score L${level}"`);
    expect(svg).toContain(`<title>Harness Score: L${level}</title>`);
  });

  test('viewBox width matches the sum of the label and value segments', () => {
    const svg = renderBadge(makeReport(2));
    expect(svg).toContain('viewBox="0 0 112 20"');
    expect(svg).toContain('width="112"');
  });
});
