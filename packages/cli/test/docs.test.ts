import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
// @ts-expect-error The root Node script is tested through its exported pure helper.
import { findMissingLocalePaths } from '../../../scripts/docs-locale-parity.mjs';
import { ALL_CHECKS, PRESET_REGISTRY } from '../src/index.js';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const LOCALES = ['en', 'pt-BR', 'es', 'zh-CN', 'hi-IN'] as const;
type Locale = (typeof LOCALES)[number];

const GUIDE_DIR = path.join(REPO, 'docs', 'guide');
const GUIDE = path.join(GUIDE_DIR, 'measure-and-improve.md');
const METRICS = path.join(GUIDE_DIR, 'metrics-and-codes.md');

function localeGuidePath(locale: Locale, file: string): string {
  return locale === 'en'
    ? path.join(REPO, 'docs', 'guide', file)
    : path.join(REPO, 'docs', locale, 'guide', file);
}

function listGuideFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

function extractAnchors(content: string): string[] {
  const matches = content.matchAll(/\{#([a-z0-9-]+)\}/g);
  return [...matches].map((m) => m[1]).sort();
}

interface CatalogRow {
  id: string;
  points: number;
}

function extractCatalogRows(content: string): CatalogRow[] {
  return content
    .split(/\r?\n/)
    .filter((line) => /^\|\s*[A-Z]+-\d+\s*\|/.test(line))
    .map((line) => {
      const columns = line.split('|').map((column) => column.trim());
      return { id: columns[1]!, points: Number(columns[2]) };
    });
}

function dimensionPoints(): Map<string, number> {
  return new Map(
    [...new Set(ALL_CHECKS.map((check) => check.dimension))].map((dimension) => [
      dimension,
      ALL_CHECKS.filter((check) => check.dimension === dimension).reduce(
        (sum, check) => sum + check.points,
        0,
      ),
    ]),
  );
}

describe('measure-and-improve guides stay in sync with the scanner', () => {
  const enAnchors = extractAnchors(fs.readFileSync(GUIDE, 'utf8'));

  for (const locale of LOCALES) {
    const guide = localeGuidePath(locale, 'measure-and-improve.md');

    test(`${locale} has the English remediation anchor set`, () => {
      expect(fs.existsSync(guide), `${locale} guide missing`).toBe(true);
      const localeAnchors = extractAnchors(fs.readFileSync(guide, 'utf8'));
      expect(localeAnchors).toEqual(enAnchors);
    });

    test(`${locale} documents every check's implemented point value`, () => {
      const content = fs.readFileSync(guide, 'utf8');
      for (const check of ALL_CHECKS) {
        const anchorIdx = content.indexOf(`{#${check.id.toLowerCase()}}`);
        const headingStart = content.lastIndexOf('####', anchorIdx);
        const headingEnd = content.indexOf('\n', headingStart);
        const heading = content.slice(headingStart, headingEnd);
        expect(heading, `${locale}: heading for ${check.id}`).toMatch(
          new RegExp(`\\b${check.points}\\s*pts?\\b`),
        );
      }
    });
  }
});

describe('built-in presets stay in sync with metrics-and-codes.md', () => {
  const metricsContent = fs.readFileSync(METRICS, 'utf8');

  test('every PRESET_REGISTRY key has a documented anchor', () => {
    const missing = Object.keys(PRESET_REGISTRY).filter(
      (name) => !metricsContent.includes(`{#preset-${name}}`),
    );
    expect(missing).toEqual([]);
  });
});

describe('metrics-and-codes check catalogs stay in sync with the scanner', () => {
  const expectedIds = ALL_CHECKS.map((check) => check.id).sort();
  const expectedDimensionPoints = dimensionPoints();

  for (const locale of LOCALES) {
    const metrics = localeGuidePath(locale, 'metrics-and-codes.md');

    test(`${locale} has one complete table row for every check`, () => {
      const content = fs.readFileSync(metrics, 'utf8');
      const checkLines = content.split(/\r?\n/).filter((line) => /^\|\s*[A-Z]+-\d+\s*\|/.test(line));
      const malformed = checkLines.filter(
        (line) => !/^\|\s*[A-Z]+-\d+\s*\|\s*\d+\s*\|\s*\S.+\|\s*\S.+\|\s*$/.test(line),
      );

      expect(malformed, `${locale}: incomplete catalog rows`).toEqual([]);
      expect(
        extractCatalogRows(content)
          .map((row) => row.id)
          .sort(),
      ).toEqual(expectedIds);
    });

    test(`${locale} uses the implemented check weights and dimension totals`, () => {
      const content = fs.readFileSync(metrics, 'utf8');
      const rows = new Map(extractCatalogRows(content).map((row) => [row.id, row]));
      for (const check of ALL_CHECKS) {
        expect(rows.get(check.id), `${locale}: missing ${check.id}`).toBeDefined();
        expect(rows.get(check.id)!.points, `${locale}: ${check.id}`).toBe(check.points);
      }

      for (const [dimension, points] of expectedDimensionPoints) {
        const rowRe = new RegExp(`\\|\\s*\\\`${dimension}\\\`\\s*\\|[^|]*\\|\\s*(\\d+)\\s*\\|`);
        const row = rowRe.exec(content);
        expect(row, `${locale}: no dimension row for ${dimension}`).not.toBeNull();
        expect(Number(row![1]), `${locale}: ${dimension} total`).toBe(points);
      }
    });
  }
});

describe('translated guides mirror English chapter set', () => {
  const enFiles = listGuideFiles(GUIDE_DIR);

  for (const locale of LOCALES.filter((locale) => locale !== 'en')) {
    test(`${locale} has the same guide files as English`, () => {
      const localeDir = path.join(REPO, 'docs', locale, 'guide');
      expect(fs.existsSync(localeDir), `${locale} guide dir missing`).toBe(true);
      expect(listGuideFiles(localeDir)).toEqual(enFiles);
    });
  }
});

describe('localized documentation staged-file coverage', () => {
  const localizedVersions = [
    'docs/guide/example.md',
    'docs/pt-BR/guide/example.md',
    'docs/es/guide/example.md',
    'docs/zh-CN/guide/example.md',
    'docs/hi-IN/guide/example.md',
  ];

  test('passes when all maintained versions of a guide page are staged', () => {
    expect(findMissingLocalePaths(localizedVersions)).toEqual([]);
  });

  test('requires all translated counterparts when the English version changes', () => {
    expect(findMissingLocalePaths(['docs/guide/example.md'])).toEqual([
      'docs/es/guide/example.md',
      'docs/hi-IN/guide/example.md',
      'docs/pt-BR/guide/example.md',
      'docs/zh-CN/guide/example.md',
    ]);
  });

  test('requires English and every other translation when one locale changes', () => {
    expect(findMissingLocalePaths(['docs/zh-CN/guide/example.md'])).toEqual([
      'docs/es/guide/example.md',
      'docs/guide/example.md',
      'docs/hi-IN/guide/example.md',
      'docs/pt-BR/guide/example.md',
    ]);
  });

  test('checks localized home pages against the matching index files', () => {
    expect(findMissingLocalePaths(['docs/pt-BR/index.md'])).toEqual([
      'docs/es/index.md',
      'docs/hi-IN/index.md',
      'docs/index.md',
      'docs/zh-CN/index.md',
    ]);
  });

  test('aggregates missing counterparts across multiple changed pages', () => {
    expect(findMissingLocalePaths(['docs/index.md', 'docs/es/guide/example.md'])).toEqual([
      'docs/es/index.md',
      'docs/guide/example.md',
      'docs/hi-IN/guide/example.md',
      'docs/hi-IN/index.md',
      'docs/pt-BR/guide/example.md',
      'docs/pt-BR/index.md',
      'docs/zh-CN/guide/example.md',
      'docs/zh-CN/index.md',
    ]);
  });

  test('ignores documentation without maintained localized counterparts', () => {
    expect(
      findMissingLocalePaths([
        'docs/i18n/glossary.md',
        'docs/public/logo.svg',
        'docs/.vitepress/config.mts',
        'CONTRIBUTING.md',
      ]),
    ).toEqual([]);
  });

  test('treats staged deletions and rename endpoints as changed paths', () => {
    expect(findMissingLocalePaths(['docs/guide/old.md', 'docs/guide/new.md'])).toEqual([
      'docs/es/guide/new.md',
      'docs/es/guide/old.md',
      'docs/hi-IN/guide/new.md',
      'docs/hi-IN/guide/old.md',
      'docs/pt-BR/guide/new.md',
      'docs/pt-BR/guide/old.md',
      'docs/zh-CN/guide/new.md',
      'docs/zh-CN/guide/old.md',
    ]);
  });
});
