import * as fs from 'node:fs';
import * as path from 'node:path';

export type GateMode = 'maturity' | 'effective';
export type ScopeFlag = 'user' | 'system';

export interface ExtraRootEntry {
  id: string;
  path: string;
}

export interface HarnessScoreConfig {
  scopes: {
    user: boolean;
    system: boolean;
  };
  extraRoots: ExtraRootEntry[];
  gate: GateMode;
}

export interface ResolvedScanConfig {
  scopes: {
    user: boolean;
    system: boolean;
  };
  extraRoots: ExtraRootEntry[];
  gate: GateMode;
  /** Scopes included in the effective score (repo is always first). */
  effectiveScopes: Array<'repo' | 'user' | 'system' | string>;
}

export const DEFAULT_CONFIG: HarnessScoreConfig = {
  scopes: { user: false, system: false },
  extraRoots: [],
  gate: 'maturity',
};

export const CONFIG_FILENAME = '.harness-score.json';

const ALLOWED_TOP_KEYS = new Set(['scopes', 'extraRoots', 'gate']);
const ALLOWED_SCOPE_KEYS = new Set(['user', 'system']);

export interface CliConfigOverrides {
  configPath?: string | null;
  /** When set, replaces config-file scope toggles. */
  scopeFlags?: ScopeFlag[] | null;
  gate?: GateMode | null;
}

function configError(message: string): never {
  throw new Error(`harness-score config: ${message}`);
}

function parseGate(value: unknown, source: string): GateMode {
  if (value === 'maturity' || value === 'effective') return value;
  configError(`${source}: gate must be "maturity" or "effective"`);
}

function parseScopes(value: unknown, source: string): HarnessScoreConfig['scopes'] {
  if (value === undefined) return { ...DEFAULT_CONFIG.scopes };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    configError(`${source}: scopes must be an object`);
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_SCOPE_KEYS.has(key)) {
      configError(`${source}: unknown scopes key "${key}"`);
    }
  }
  const user = obj.user;
  const system = obj.system;
  if (user !== undefined && typeof user !== 'boolean') {
    configError(`${source}: scopes.user must be a boolean`);
  }
  if (system !== undefined && typeof system !== 'boolean') {
    configError(`${source}: scopes.system must be a boolean`);
  }
  return {
    user: user === true,
    system: system === true,
  };
}

function parseExtraRoots(value: unknown, source: string): ExtraRootEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) configError(`${source}: extraRoots must be an array`);
  return value.map((entry, index) => {
    const label = `${source}.extraRoots[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      configError(`${label}: must be an object`);
    }
    const obj = entry as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (key !== 'id' && key !== 'path') {
        configError(`${label}: unknown key "${key}"`);
      }
    }
    if (typeof obj.id !== 'string' || obj.id.trim() === '') {
      configError(`${label}: id must be a non-empty string`);
    }
    if (typeof obj.path !== 'string' || obj.path.trim() === '') {
      configError(`${label}: path must be a non-empty string`);
    }
    return { id: obj.id.trim(), path: obj.path.trim() };
  });
}

/** Parse and validate a config object (strict — unknown keys are rejected). */
export function parseConfigObject(raw: unknown, source: string): HarnessScoreConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    configError(`${source}: must be a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      configError(`${source}: unknown key "${key}"`);
    }
  }
  return {
    scopes: parseScopes(obj.scopes, source),
    extraRoots: parseExtraRoots(obj.extraRoots, source),
    gate: obj.gate === undefined ? 'maturity' : parseGate(obj.gate, source),
  };
}

export function loadConfigFile(configPath: string): HarnessScoreConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    configError(`could not read/parse ${configPath}: ${String(error)}`);
  }
  return parseConfigObject(raw, configPath);
}

export function discoverConfig(repoRoot: string): HarnessScoreConfig | null {
  const configPath = path.join(repoRoot, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) return null;
  return loadConfigFile(configPath);
}

export function parseScopeFlagList(value: string): ScopeFlag[] {
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const flags: ScopeFlag[] = [];
  for (const part of parts) {
    if (part !== 'user' && part !== 'system') {
      configError(`--scope: unknown scope "${part}" (allowed: user, system)`);
    }
    if (!flags.includes(part)) flags.push(part);
  }
  return flags;
}

/** Merge defaults → config file → CLI overrides. */
export function resolveScanConfig(repoRoot: string, overrides: CliConfigOverrides = {}): ResolvedScanConfig {
  let base: HarnessScoreConfig = { ...DEFAULT_CONFIG, scopes: { ...DEFAULT_CONFIG.scopes }, extraRoots: [] };

  const explicitConfigPath = overrides.configPath;
  if (explicitConfigPath) {
    base = loadConfigFile(path.resolve(explicitConfigPath));
  } else {
    const discovered = discoverConfig(repoRoot);
    if (discovered) base = discovered;
  }

  let user = base.scopes.user;
  let system = base.scopes.system;
  if (overrides.scopeFlags !== undefined && overrides.scopeFlags !== null) {
    user = overrides.scopeFlags.includes('user');
    system = overrides.scopeFlags.includes('system');
  }

  const gate = overrides.gate ?? base.gate;

  const effectiveScopes: ResolvedScanConfig['effectiveScopes'] = ['repo'];
  if (user) effectiveScopes.push('user');
  if (system) effectiveScopes.push('system');
  for (const extra of base.extraRoots) {
    if (!effectiveScopes.includes(extra.id)) effectiveScopes.push(extra.id);
  }

  return {
    scopes: { user, system },
    extraRoots: base.extraRoots,
    gate,
    effectiveScopes,
  };
}
