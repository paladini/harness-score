import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
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
