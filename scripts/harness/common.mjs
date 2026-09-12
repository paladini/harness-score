import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const VERSION = '0.10.6';
export const PACKAGE = '@tech-leads-club/harness-toolkit';
export const SOURCE_REPOSITORY = 'https://github.com/tech-leads-club/harness-toolkit';
export const SOURCE_BRANCH = 'feature/add-providers';
export const SOURCE_COMMIT = '87a7565546bf5764cb8710319d110cfa59b4c732';
export const SOURCE_SPEC = `git+${SOURCE_REPOSITORY}.git#${SOURCE_COMMIT}`;
export const TIMEOUT = 600_000;
export function paths(root = ROOT) {
  const cache = join(root, '.cache', 'harness-toolkit');
  const runtime = join(cache, 'runtime');
  return {
    cache,
    runtime,
    prefix: join(cache, 'package'),
    cursor: join(runtime, 'providers', 'cursor'),
    claude: join(runtime, 'providers', 'claude'),
    codex: join(runtime, 'providers', 'codex'),
    copilot: join(runtime, 'providers', 'copilot'),
    bin: join(runtime, 'bin-links'),
    enabled: join(cache, 'enabled.json'),
    source: join(cache, 'source.json'),
    evidence: join(cache, 'evidence'),
    lock: join(cache, 'verification.lock'),
  };
}
export function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}
export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temp, path);
}
export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}
export function trackedInputs(root) {
  return [
    ...new Set(git(root, ['ls-files', '-c', '-o', '--exclude-standard', '-z']).split('\0').filter(Boolean)),
  ]
    .filter((file) => !file.startsWith('.cache/') && !file.startsWith('.tlc/harness/state/'))
    .sort();
}
export function fingerprint(root) {
  const hash = createHash('sha256');
  for (const file of trackedInputs(root)) {
    const path = join(root, file);
    hash.update(`${file}\0`);
    if (!existsSync(path)) {
      hash.update('deleted\0');
      continue;
    }
    const stat = lstatSync(path);
    if (stat.isSymbolicLink())
      throw new Error(`Verification input is a symlink: ${file} -> ${readlinkSync(path)}`);
    if (!stat.isFile()) throw new Error(`Verification input is not a file: ${file}`);
    hash.update(`${stat.mode & 0o111}\0`);
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return hash.digest('hex');
}
export function identity(root) {
  return {
    head: git(root, ['rev-parse', 'HEAD']).trim(),
    fingerprint: fingerprint(root),
    node: process.version,
  };
}
export function isolatedEnv(root, overrides = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('TLC_')) delete env[key];
  const p = paths(root);
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = [p.bin, env[pathKey]].filter(Boolean).join(process.platform === 'win32' ? ';' : ':');
  return {
    ...env,
    TLC_HOME: p.runtime,
    TLC_HOME_FROM_ENV: '1',
    TLC_INSTALL_DEST: p.runtime,
    TLC_BIN_DIR: p.bin,
    CURSOR_CONFIG_DIR: p.cursor,
    CLAUDE_CONFIG_DIR: p.claude,
    CODEX_HOME: p.codex,
    COPILOT_CONFIG_DIR: p.copilot,
    CURSOR_PROJECT_DIR: root,
    TLC_PROJECT_DIR: root,
    CLAUDE_PROJECT_DIR: root,
    ...overrides,
  };
}
export function runtimeHealth(
  root,
  {
    nodeMajor = Number(process.versions.node.split('.')[0]),
    probeBun = () => spawnSync('bun', ['--version'], { encoding: 'utf8', timeout: 5_000 }),
  } = {},
) {
  const p = paths(root);
  const manifest = readJson(join(p.runtime, 'package.json'));
  if (manifest?.version !== VERSION)
    return `Expected toolkit ${VERSION}; found ${manifest?.version ?? 'no runtime'}`;
  const source = readJson(p.source);
  if (source?.commit !== SOURCE_COMMIT)
    return `Expected toolkit source ${SOURCE_COMMIT}; found ${source?.commit ?? 'no provenance'}`;
  for (const file of ['bin/tlc-exec.mjs', 'dist/tool-before.mjs', 'dist/stop.mjs', 'dist/tlc-cli.mjs']) {
    if (!existsSync(join(p.runtime, file))) return `Missing toolkit runtime file: ${file}`;
  }
  if (nodeMajor < 24) {
    const bun = probeBun();
    if (bun.error || bun.status !== 0) {
      return `Toolkit hooks require Node 24+ or Bun; running ${process.version} and Bun is unavailable`;
    }
  }
  return null;
}
export function run(root, command, args, options = {}) {
  if (command === 'npm' && process.platform === 'win32') {
    const npmCli =
      process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (!existsSync(npmCli))
      throw new Error('Cannot locate npm-cli.js beside Node. Run through npm run harness:setup.');
    command = process.execPath;
    args = [npmCli, ...args];
  }
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: TIMEOUT,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status ?? result.error?.code}):\n${result.stderr ?? ''}\n${result.stdout ?? ''}`,
    );
  }
  return result;
}
