import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createScanContext, walkDirectory } from '../src/scan.js';
import { buildReportFromScanContext } from '../src/score.js';
import type { ScanContext } from '../src/types.js';

const tmpDirs: string[] = [];

function mkTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-score-scan-'));
  tmpDirs.push(dir);
  return dir;
}

function virtualDirent(name: string, type: 'directory' | 'file' | 'symlink'): fs.Dirent {
  return {
    name,
    isDirectory: () => type === 'directory',
    isFile: () => type === 'file',
    isSymbolicLink: () => type === 'symlink',
  } as fs.Dirent;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('createScanContext — production limits', () => {
  test('includes files beyond ten directory levels without truncating the scan', () => {
    const root = mkTmpDir();
    const segments = Array.from({ length: 12 }, (_, index) => `level-${index + 1}`);
    const deepDirectory = path.join(root, ...segments);
    fs.mkdirSync(deepDirectory, { recursive: true });
    fs.writeFileSync(path.join(deepDirectory, 'AGENTS.md'), '# deep harness signal');

    const ctx = createScanContext(root);
    const deepFile = `${segments.join('/')}/AGENTS.md`;

    expect(ctx.has(deepFile)).toBe(true);
    expect(ctx.read(deepFile)).toBe('# deep harness signal');
    expect(ctx.truncated).toBe(false);
    expect(ctx.incompleteReasons).toEqual([]);
  });

  test('detects a relevant signal after the former 20,000-file limit', () => {
    const fileCount = 25_000;
    const virtualFiles = Array.from({ length: fileCount }, (_, index) => {
      const name = `file-${index.toString().padStart(5, '0')}.txt`;
      return virtualDirent(name, 'file');
    });
    virtualFiles.push(virtualDirent('zzzz-signal', 'directory'));

    const result = walkDirectory('virtual-root', {
      readDirectory: (directory) =>
        directory.endsWith('zzzz-signal') ? [virtualDirent('AGENTS.md', 'file')] : virtualFiles,
    });
    const fileSet = new Set(result.files);
    const ctx: ScanContext = {
      root: 'virtual-root',
      files: result.files,
      truncated: result.truncated,
      incompleteReasons: result.incompleteReasons,
      has: (relPath) => fileSet.has(relPath),
      read: (relPath) => (relPath === 'zzzz-signal/AGENTS.md' ? '# nested agent context' : null),
      matching: (re) => result.files.filter((file) => re.test(file)),
    };
    const report = buildReportFromScanContext(ctx);

    expect(result.files).toHaveLength(fileCount + 1);
    expect(result.files.at(-1)).toBe('zzzz-signal/AGENTS.md');
    expect(result.truncated).toBe(false);
    expect(result.incompleteReasons).toEqual([]);
    expect(report.checks.find((check) => check.id === 'CTX-03')?.passed).toBe(true);
  });
});

describe('createScanContext — symlinks', () => {
  test('follows a symlinked directory whose target is inside the scan root', () => {
    const root = mkTmpDir();
    fs.mkdirSync(path.join(root, 'repo'));
    fs.mkdirSync(path.join(root, 'repo', 'target'));
    fs.writeFileSync(path.join(root, 'repo', 'target', 'AGENTS.md'), '# hi');
    try {
      fs.symlinkSync(path.join(root, 'repo', 'target'), path.join(root, 'repo', 'shared'), 'dir');
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
    expect(occurrences).toEqual(['a/file.txt']);
    expect(ctx.truncated).toBe(false);
  });

  test('prefers the canonical directory over lexically earlier aliases', () => {
    const root = mkTmpDir();
    const repo = path.join(root, 'repo');
    fs.mkdirSync(repo);
    const shared = path.join(repo, 'shared');
    fs.mkdirSync(shared);
    fs.writeFileSync(path.join(shared, 'file.txt'), 'content');
    try {
      fs.symlinkSync(shared, path.join(repo, 'alias-b'), 'dir');
      fs.symlinkSync(shared, path.join(repo, 'alias-a'), 'dir');
    } catch {
      return;
    }

    const ctx = createScanContext(repo);
    expect(ctx.files).toEqual(['shared/file.txt']);
    expect(ctx.truncated).toBe(false);
  });

  test('does not let a harness-shaped alias hide the canonical harness path', () => {
    const root = mkTmpDir();
    const cursorRules = path.join(root, '.cursor', 'rules');
    fs.mkdirSync(cursorRules, { recursive: true });
    fs.writeFileSync(
      path.join(cursorRules, 'project.mdc'),
      '---\ndescription: Project rules\nglobs: "src/**"\n---\n\nRule body.\n',
    );
    try {
      fs.symlinkSync(path.join(root, '.cursor'), path.join(root, '.claude'), 'dir');
    } catch {
      return;
    }

    const ctx = createScanContext(root);
    const report = buildReportFromScanContext(ctx);

    expect(ctx.files).toEqual(['.cursor/rules/project.mdc']);
    expect(report.detectedHarnesses).toContain('cursor');
    expect(report.verdicts?.maturity).toEqual({ status: 'complete', reasons: [] });
  });

  test('skips generated-directory symlinks before inspecting their targets', () => {
    const root = mkTmpDir();
    const repo = path.join(root, 'repo');
    const outside = path.join(root, 'outside');
    fs.mkdirSync(repo);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'irrelevant.txt'), 'must stay outside');
    try {
      fs.symlinkSync(outside, path.join(repo, 'node_modules'), 'dir');
    } catch {
      return;
    }

    const ctx = createScanContext(repo);

    expect(ctx.files).toEqual([]);
    expect(ctx.truncated).toBe(false);
    expect(ctx.incompleteReasons).toEqual([]);
  });

  test('skips a devbox binary symlink that resolves outside the repo root', () => {
    const root = mkTmpDir();
    const repo = path.join(root, 'repo');
    const outside = path.join(root, 'outside');
    fs.mkdirSync(repo);
    fs.mkdirSync(outside);
    const devboxBin = path.join(outside, 'devbox');
    fs.writeFileSync(devboxBin, 'must stay outside');
    fs.mkdirSync(path.join(repo, '.devbox', 'bin'), { recursive: true });
    try {
      fs.symlinkSync(devboxBin, path.join(repo, '.devbox', 'bin', 'devbox'), 'file');
    } catch {
      return;
    }

    const ctx = createScanContext(repo);

    expect(ctx.files).toEqual([]);
    expect(ctx.truncated).toBe(false);
    expect(ctx.incompleteReasons).toEqual([]);
  });

  test('does not enumerate an external directory symlink and fails closed with its path', () => {
    const root = mkTmpDir();
    const repo = path.join(root, 'repo');
    const outside = path.join(root, 'outside');
    fs.mkdirSync(repo);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'AGENTS.md'), '# must stay outside');
    try {
      fs.symlinkSync(outside, path.join(repo, 'external-dir'), 'dir');
    } catch {
      return;
    }

    const ctx = createScanContext(repo);
    const report = buildReportFromScanContext(ctx);

    expect(ctx.files).toEqual([]);
    expect(ctx.has('external-dir/AGENTS.md')).toBe(false);
    expect(ctx.read('external-dir/AGENTS.md')).toBeNull();
    expect(ctx.truncated).toBe(true);
    expect(ctx.incompleteReasons).toEqual([{ code: 'outside-root-symlink', path: 'external-dir' }]);
    expect(report.verdicts?.maturity).toEqual({
      status: 'incomplete',
      reasons: [{ code: 'outside-root-symlink', path: 'external-dir' }],
    });
  });

  test('does not discover or read an external file symlink and fails closed with its path', () => {
    const root = mkTmpDir();
    const repo = path.join(root, 'repo');
    const outsideFile = path.join(root, 'outside-AGENTS.md');
    fs.mkdirSync(repo);
    fs.writeFileSync(outsideFile, '# must not be read');
    try {
      fs.symlinkSync(outsideFile, path.join(repo, 'AGENTS.md'), 'file');
    } catch {
      return;
    }

    const ctx = createScanContext(repo);

    expect(ctx.files).toEqual([]);
    expect(ctx.has('AGENTS.md')).toBe(false);
    expect(ctx.read('AGENTS.md')).toBeNull();
    expect(ctx.truncated).toBe(true);
    expect(ctx.incompleteReasons).toEqual([{ code: 'outside-root-symlink', path: 'AGENTS.md' }]);
  });

  test('records symlink stat permission and I/O errors as unreadable paths', () => {
    for (const code of ['EACCES', 'EPERM', 'EIO']) {
      const error = Object.assign(new Error(code), { code });
      const result = walkDirectory('virtual-root', {
        readDirectory: () => [virtualDirent('linked', 'symlink')],
        statPath: () => {
          throw error;
        },
      });
      expect(result.incompleteReasons).toEqual([{ code: 'unreadable-path', path: 'linked' }]);
      expect(result.truncated).toBe(true);
    }
  });

  test('ignores only genuinely missing or broken symlink targets', () => {
    for (const code of ['ENOENT', 'ENOTDIR', 'ELOOP']) {
      const error = Object.assign(new Error(code), { code });
      const result = walkDirectory('virtual-root', {
        readDirectory: () => [virtualDirent('broken', 'symlink')],
        statPath: () => {
          throw error;
        },
      });
      expect(result).toEqual({ files: [], truncated: false, incompleteReasons: [] });
    }
  });
});

describe('createScanContext — preserved safety boundaries', () => {
  test('skips dependency and generated directories plus generated Yarn paths', () => {
    const root = mkTmpDir();
    const skippedDirectories = [
      '.git',
      'node_modules',
      'dist',
      'build',
      'out',
      'coverage',
      'target',
      'vendor',
      '__pycache__',
      '.venv',
      'venv',
      '.tox',
      '.next',
      '.nuxt',
      '.cache',
      '.turbo',
      '.idea',
      '.nx',
      '.pnp',
      '.parcel-cache',
      '.angular',
      '.pytest_cache',
      '.mypy_cache',
      '.ruff_cache',
      '.devbox',
    ];
    for (const directory of skippedDirectories) {
      fs.mkdirSync(path.join(root, directory), { recursive: true });
      fs.writeFileSync(path.join(root, directory, 'AGENTS.md'), '# skipped');
    }
    fs.mkdirSync(path.join(root, '.yarn', 'cache'), { recursive: true });
    fs.mkdirSync(path.join(root, '.yarn', 'unplugged'), { recursive: true });
    fs.mkdirSync(path.join(root, '.yarn', 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(root, '.yarn', 'cache', 'AGENTS.md'), '# skipped');
    fs.writeFileSync(path.join(root, '.yarn', 'unplugged', 'AGENTS.md'), '# skipped');
    fs.writeFileSync(path.join(root, '.yarn', 'install-state.gz'), 'skipped');
    fs.writeFileSync(path.join(root, '.yarn', 'plugins', 'kept.cjs'), 'kept');

    const ctx = createScanContext(root);

    expect(ctx.files).toEqual(['.yarn/plugins/kept.cjs']);
    expect(ctx.truncated).toBe(false);
  });

  test('reads exactly 512 KiB but intentionally ignores larger file bodies', () => {
    const root = mkTmpDir();
    const atLimit = 'a'.repeat(512 * 1024);
    fs.writeFileSync(path.join(root, 'at-limit.txt'), atLimit);
    fs.writeFileSync(path.join(root, 'over-limit.txt'), `${atLimit}b`);

    const ctx = createScanContext(root);

    expect(ctx.read('at-limit.txt')).toBe(atLimit);
    expect(ctx.read('over-limit.txt')).toBeNull();
    expect(ctx.truncated).toBe(false);
    expect(ctx.incompleteReasons).toEqual([]);
  });

  test('marks a discovered file that becomes unreadable when requested', () => {
    const root = mkTmpDir();
    const agentsPath = path.join(root, 'AGENTS.md');
    fs.writeFileSync(agentsPath, '# present during discovery');
    const ctx = createScanContext(root);
    fs.unlinkSync(agentsPath);

    expect(ctx.read('AGENTS.md')).toBeNull();
    expect(ctx.truncated).toBe(true);
    expect(ctx.incompleteReasons).toEqual([{ code: 'unreadable-path', path: 'AGENTS.md' }]);
  });

  test('prefixes an unreadable overlay path with its deterministic label', () => {
    const root = mkTmpDir();
    const missingOverlayFile = path.join(root, 'missing-AGENTS.md');
    const ctx = createScanContext(root, {
      overlays: [{ label: 'team', files: new Map([['shared/AGENTS.md', missingOverlayFile]]) }],
    });

    expect(ctx.read('shared/AGENTS.md')).toBeNull();
    expect(ctx.incompleteReasons).toEqual([{ code: 'unreadable-path', path: 'team:shared/AGENTS.md' }]);
  });
});

describe('deterministic incomplete scan reasons', () => {
  test('sorts directory entries before applying the file-count limit', () => {
    const root = mkTmpDir();
    for (const name of ['z.txt', 'a.txt', 'm.txt']) fs.writeFileSync(path.join(root, name), name);
    const reverseRead = (directory: string) => fs.readdirSync(directory, { withFileTypes: true }).reverse();

    const result = walkDirectory(root, { maxFiles: 2, readDirectory: reverseRead });
    expect(result.files).toEqual(['a.txt', 'm.txt']);
    expect(result.incompleteReasons).toEqual([{ code: 'file-count-limit', path: 'z.txt', limit: 2 }]);
    expect(result.truncated).toBe(true);
  });

  test('records the first deterministic directory skipped by the depth limit', () => {
    const root = mkTmpDir();
    fs.mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
    fs.mkdirSync(path.join(root, 'z', 'b'), { recursive: true });
    fs.writeFileSync(path.join(root, 'a', 'b', 'deep.txt'), 'deep');

    const result = walkDirectory(root, { maxDepth: 1 });
    expect(result.files).toEqual([]);
    expect(result.incompleteReasons).toEqual([{ code: 'depth-limit', path: 'a/b', limit: 1 }]);
  });

  test('records an unreadable directory and continues scanning deterministic siblings', () => {
    const root = mkTmpDir();
    fs.mkdirSync(path.join(root, 'a-blocked'));
    fs.mkdirSync(path.join(root, 'b-readable'));
    fs.writeFileSync(path.join(root, 'b-readable', 'visible.txt'), 'visible');
    const injectedRead = (directory: string): fs.Dirent[] => {
      if (path.basename(directory) === 'a-blocked') throw new Error('permission denied');
      return fs.readdirSync(directory, { withFileTypes: true });
    };

    const result = walkDirectory(root, { readDirectory: injectedRead });
    expect(result.files).toEqual(['b-readable/visible.txt']);
    expect(result.incompleteReasons).toEqual([{ code: 'unreadable-directory', path: 'a-blocked' }]);
  });

  test('converts a legacy truncated overlay to a file-count reason', () => {
    const root = mkTmpDir();
    const ctx = createScanContext(root, {
      overlays: [{ label: 'legacy', files: new Map(), truncated: true }],
    });
    expect(ctx.truncated).toBe(true);
    expect(ctx.incompleteReasons).toEqual([{ code: 'file-count-limit' }]);
  });
});
