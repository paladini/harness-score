import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/index.js';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const GUIDE = path.join(REPO, 'docs', 'guide', 'measure-and-improve.md');

function extractAnchors(content: string): string[] {
  const matches = content.matchAll(/\{#([a-z0-9-]+)\}/g);
  return [...matches].map((m) => m[1]).sort();
}

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

describe('translated measure-and-improve guides preserve anchors', () => {
  const enAnchors = extractAnchors(fs.readFileSync(GUIDE, 'utf8'));

  for (const locale of ['pt-BR', 'es', 'zh-CN'] as const) {
    test(`${locale} has the same anchor set as English`, () => {
      const translated = path.join(REPO, 'docs', locale, 'guide', 'measure-and-improve.md');
      expect(fs.existsSync(translated), `${locale} guide missing`).toBe(true);
      const localeAnchors = extractAnchors(fs.readFileSync(translated, 'utf8'));
      expect(localeAnchors).toEqual(enAnchors);
    });
  }
});
