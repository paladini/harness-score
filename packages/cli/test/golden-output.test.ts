import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { score } from '../src/index.js';
import type { Report } from '../src/types.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, '..', '..', '..', 'fixtures');
const REPO_ROOT = path.join(HERE, '..', '..', '..');

/**
 * `tool.version` legitimately changes on every release regardless of whether
 * the scan/build behavior changed at all — excluded so this snapshot only
 * flags genuine output regressions (see "Garantias de não-quebra" in the
 * distribution/perf improvement plan).
 */
function normalize(report: Report) {
  const { tool: _tool, ...rest } = report;
  return rest;
}

describe('golden output — regression baseline for build/packaging/scan changes', () => {
  test.each(['level-0', 'level-1', 'level-2', 'level-3', 'level-4'])('%s report is stable', (fixture) => {
    const report = score(path.join(FIXTURES, fixture));
    expect(normalize(report)).toMatchSnapshot();
  });

  test('self-scan (this repo) report is stable', () => {
    const report = score(REPO_ROOT);
    expect(normalize(report)).toMatchSnapshot();
  });
});
