import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_CHECKS } from '../src/checks/index.js';
import { computeDiff } from '../src/diff.js';
import { score } from '../src/index.js';
import { renderBadge } from '../src/report/badge.js';
import { renderMarkdown } from '../src/report/markdown.js';
import { renderTerminal } from '../src/report/terminal.js';
import { createScanContext } from '../src/scan.js';
import { buildReport, DOCS_BASE_URL, LEVEL_NAMES, LEVEL_REQUIREMENTS, TOOL_VERSION } from '../src/score.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures');

describe('score()', () => {
  test('composes createScanContext + buildReport identically to calling them directly', () => {
    const fixture = path.join(FIXTURES, 'level-2');
    const viaScore = score(fixture);
    const viaDirect = buildReport(createScanContext(fixture));
    expect(viaScore).toEqual(viaDirect);
  });
});

describe('public export surface', () => {
  test('every documented export is defined', () => {
    const exports: Array<[string, unknown]> = [
      ['ALL_CHECKS', ALL_CHECKS],
      ['computeDiff', computeDiff],
      ['renderBadge', renderBadge],
      ['renderMarkdown', renderMarkdown],
      ['renderTerminal', renderTerminal],
      ['createScanContext', createScanContext],
      ['buildReport', buildReport],
      ['DOCS_BASE_URL', DOCS_BASE_URL],
      ['LEVEL_NAMES', LEVEL_NAMES],
      ['LEVEL_REQUIREMENTS', LEVEL_REQUIREMENTS],
      ['TOOL_VERSION', TOOL_VERSION],
      ['score', score],
    ];
    for (const [name, value] of exports) {
      expect(value, `expected export "${name}" to be defined`).toBeDefined();
    }
  });
});
