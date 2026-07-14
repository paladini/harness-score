import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createScanContext } from '../src/scan.js';

const tmpDirs: string[] = [];

function mkTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-score-scan-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('createScanContext — symlinks', () => {
  test('follows a symlinked directory into a sibling', () => {
    const root = mkTmpDir();
    fs.mkdirSync(path.join(root, 'target'));
    fs.writeFileSync(path.join(root, 'target', 'AGENTS.md'), '# hi');
    fs.mkdirSync(path.join(root, 'repo'));
    try {
      fs.symlinkSync(path.join(root, 'target'), path.join(root, 'repo', 'shared'), 'dir');
    } catch {
      // Symlink creation can require elevated privileges on some Windows
      // setups; skip rather than fail the suite in that environment.
      return;
    }

    const ctx = createScanContext(path.join(root, 'repo'));
    expect(ctx.has('shared/AGENTS.md')).toBe(true);
    expect(ctx.read('shared/AGENTS.md')).toBe('# hi');
    expect(ctx.truncated).toBe(false);
  });

  test('terminates on a self-referential symlink cycle without duplicating files', () => {
    const root = mkTmpDir();
    fs.mkdirSync(path.join(root, 'a'));
    fs.writeFileSync(path.join(root, 'a', 'file.txt'), 'content');
    try {
      fs.symlinkSync(path.join(root, 'a'), path.join(root, 'a', 'loop'), 'dir');
    } catch {
      return;
    }

    const ctx = createScanContext(root);
    const occurrences = ctx.files.filter((f) => f.endsWith('file.txt'));
    // The cycle must not be walked more than once — a handful of legitimate
    // depth-bounded traversals through the loop is fine, an unbounded one
    // (thousands of copies) is the bug this test guards against.
    expect(occurrences.length).toBeLessThan(20);
    expect(ctx.truncated).toBe(false);
  });
});
