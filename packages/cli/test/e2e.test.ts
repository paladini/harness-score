import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, '..', 'dist', 'cli.js');
const FIXTURES = path.join(here, '..', '..', '..', 'fixtures');
const REPO_ROOT = path.join(here, '..', '..', '..');

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

function tmpFile(name: string): string {
  return path.join(os.tmpdir(), `hs-e2e-${process.pid}-${name}`);
}

describe('e2e — real usage scenarios', () => {
  test('scanning a zero-harness repo produces consistent JSON, terminal, markdown, and badge output', () => {
    const jsonResult = run([path.join(FIXTURES, 'level-0'), '--json']);
    expect(jsonResult.status).toBe(0);
    const report = JSON.parse(jsonResult.stdout);
    expect(report.level.index).toBe(0);

    const terminalResult = run([path.join(FIXTURES, 'level-0')]);
    expect(terminalResult.stdout).toContain('Improvements (');
    expect(terminalResult.stdout).not.toContain('fully harnessed');

    const mdResult = run([path.join(FIXTURES, 'level-0'), '--md', '-', '--quiet']);
    expect(mdResult.stdout).toContain('# Harness Score Report');
    expect(mdResult.stdout).toContain('## Recommended improvements');

    const badgePath = tmpFile('badge-level0.svg');
    const badgeResult = run([path.join(FIXTURES, 'level-0'), '--badge', badgePath, '--quiet']);
    expect(badgeResult.status).toBe(0);
    expect(fs.readFileSync(badgePath, 'utf8')).toContain('>L0<');
    fs.unlinkSync(badgePath);
  });

  test('baseline-then-diff flow surfaces the full diff section in the markdown report', () => {
    const baselinePath = tmpFile('baseline.json');
    const baseline = run([path.join(FIXTURES, 'level-2'), '--json', '--quiet']);
    fs.writeFileSync(baselinePath, baseline.stdout, 'utf8');

    const mdResult = run([path.join(FIXTURES, 'level-4'), '--diff', baselinePath, '--md', '-', '--quiet']);
    expect(mdResult.status).toBe(0);
    expect(mdResult.stdout).toContain('## Compared to baseline');
    expect(mdResult.stdout).toContain('**Level:** L2 · Guided → L4 · Self-correcting (+2)');
    expect(mdResult.stdout).toMatch(/\| Dimension \| Before \| After \| Δ \|/);

    fs.unlinkSync(baselinePath);
  });

  test("--min-level gates exactly at the repository's own boundary", () => {
    const atLevel = run([path.join(FIXTURES, 'level-3'), '--min-level', '3', '--quiet']);
    expect(atLevel.status).toBe(0);

    const aboveLevel = run([path.join(FIXTURES, 'level-3'), '--min-level', '4', '--quiet']);
    expect(aboveLevel.status).toBe(1);
    expect(aboveLevel.stderr).toContain('below required L4');
    expect(aboveLevel.stderr).toContain('hooks');
  });

  test('self-audit: scanning the monorepo itself stays at L4 with a high score, mirroring CI', () => {
    const result = run([REPO_ROOT, '--json', '--quiet', '--min-level', '4']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.level.index).toBe(4);
    expect(report.score.percent).toBeGreaterThanOrEqual(80);
  });

  test('combined --json/--md/--badge flags in one invocation all produce correct output together', () => {
    const mdPath = tmpFile('combined.md');
    const badgePath = tmpFile('combined.svg');
    const result = run([
      path.join(FIXTURES, 'level-1'),
      '--json',
      '--md',
      mdPath,
      '--badge',
      badgePath,
      '--min-level',
      '0',
      '--quiet',
    ]);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.level.index).toBe(1);
    expect(fs.readFileSync(mdPath, 'utf8')).toContain('# Harness Score Report');
    expect(fs.readFileSync(badgePath, 'utf8')).toContain('>L1<');
    fs.unlinkSync(mdPath);
    fs.unlinkSync(badgePath);
  });

  test('rejects an unknown flag and a non-integer --min-level without crashing', () => {
    const unknownFlag = run([path.join(FIXTURES, 'level-0'), '--nonexistent-flag']);
    expect(unknownFlag.status).toBe(2);
    expect(unknownFlag.stderr).toContain('Unknown option: --nonexistent-flag');
    expect(unknownFlag.stderr).toContain('Usage:');

    const badMinLevel = run([path.join(FIXTURES, 'level-0'), '--min-level', 'abc']);
    expect(badMinLevel.status).toBe(2);
    expect(badMinLevel.stderr).toContain('--min-level must be an integer between 0 and 4');
  });
});
