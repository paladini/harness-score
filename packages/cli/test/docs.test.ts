import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/index.js';

const GUIDE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'guide',
  'measure-and-improve.md',
);

describe('docs stay in sync with the scanner', () => {
  const content = fs.readFileSync(GUIDE, 'utf8');

  test('every check has a remediation anchor in the guide', () => {
    const missing = ALL_CHECKS.map((c) => c.id.toLowerCase()).filter(
      (anchor) => !content.includes(`{#${anchor}}`),
    );
    expect(missing).toEqual([]);
  });

  test('documented point values match the implementation', () => {
    for (const check of ALL_CHECKS) {
      const anchorIdx = content.indexOf(`{#${check.id.toLowerCase()}}`);
      const heading = content.lastIndexOf('####', anchorIdx);
      const line = content.slice(heading, anchorIdx);
      expect(line, `heading for ${check.id}`).toContain(`${check.points} pt`);
    }
  });
});
