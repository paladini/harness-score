import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_CONFIG,
  loadConfigFile,
  parseConfigObject,
  parseScopeFlagList,
  resolveScanConfig,
} from '../src/config.js';

describe('parseConfigObject', () => {
  test('accepts defaults when keys are omitted', () => {
    expect(parseConfigObject({}, 'test')).toEqual(DEFAULT_CONFIG);
  });

  test('rejects unknown top-level keys', () => {
    expect(() => parseConfigObject({ unknown: true }, 'test')).toThrow(/unknown key/);
  });

  test('rejects unknown scopes keys', () => {
    expect(() => parseConfigObject({ scopes: { repo: true } }, 'test')).toThrow(/unknown scopes key/);
  });

  test('parses scopes and gate', () => {
    expect(
      parseConfigObject(
        {
          scopes: { user: true, system: false },
          gate: 'effective',
          extraRoots: [{ id: 'team', path: '../shared' }],
        },
        'test',
      ),
    ).toEqual({
      scopes: { user: true, system: false },
      extraRoots: [{ id: 'team', path: '../shared' }],
      gate: 'effective',
    });
  });
});

describe('resolveScanConfig precedence', () => {
  test('CLI scope flags override config file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-cfg-'));
    const configPath = path.join(dir, '.harness-score.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ scopes: { user: true, system: true }, gate: 'effective' }),
      'utf8',
    );
    const resolved = resolveScanConfig(dir, {
      configPath,
      scopeFlags: [],
      gate: null,
    });
    expect(resolved.scopes.user).toBe(false);
    expect(resolved.scopes.system).toBe(false);
    expect(resolved.gate).toBe('effective');
    expect(resolved.effectiveScopes).toEqual(['repo']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('CLI gate overrides config file gate', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-cfg-'));
    fs.writeFileSync(path.join(dir, '.harness-score.json'), JSON.stringify({ gate: 'effective' }), 'utf8');
    const resolved = resolveScanConfig(dir, { gate: 'maturity' });
    expect(resolved.gate).toBe('maturity');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('parseScopeFlagList', () => {
  test('parses comma-separated scopes', () => {
    expect(parseScopeFlagList('user,system')).toEqual(['user', 'system']);
  });

  test('rejects unknown scope names', () => {
    expect(() => parseScopeFlagList('repo')).toThrow(/unknown scope/);
  });
});

describe('loadConfigFile', () => {
  test('loads valid JSON from disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-cfg-'));
    const file = path.join(dir, '.harness-score.json');
    fs.writeFileSync(file, JSON.stringify({ scopes: { user: true, system: false } }), 'utf8');
    expect(loadConfigFile(file).scopes.user).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
