import * as fs from 'node:fs';
import * as path from 'node:path';
import { ALL_CHECKS } from './checks/index.js';

/** Snapshot used to decide whether a maturity gate passes. */
export type GateMode = 'maturity' | 'effective';
/** Additional machine-level scope to include in the effective snapshot. */
export type ScopeFlag = 'user' | 'system';

/**
 * A check's scoring severity, borrowing ESLint's own vocabulary. Only 'off'
 * and 'error' are accepted in v1.5 — 'warn' is a recognized value that's
 * deliberately rejected for now (reserved for a future "advisory, non-blocking"
 * mode), not an unrecognized one.
 */
export type Severity = 'off' | 'warn' | 'error';

/** Named additional filesystem root to include in the effective snapshot. */
export interface ExtraRootEntry {
  id: string;
  path: string;
}

/** Options controlling filesystem discovery. */
export interface ScanConfig {
  /** Exact repo-relative paths made visible inside otherwise skipped directories. */
  includePaths: string[];
}

/** Parsed team configuration for a scan. */
export interface HarnessScoreConfig {
  scan?: ScanConfig;
  scopes: {
    user: boolean;
    system: boolean;
  };
  extraRoots: ExtraRootEntry[];
  gate: GateMode;
  /** Named, maintainer-curated presets to apply, in order (see PRESET_REGISTRY). */
  extends: string[];
  /** Per-check-ID severity override, applied after every preset in `extends`. */
  rules: Record<string, Severity>;
}

/** Configuration after defaults and command-line overrides have been applied. */
export interface ResolvedScanConfig {
  scan?: ScanConfig;
  scopes: {
    user: boolean;
    system: boolean;
  };
  extraRoots: ExtraRootEntry[];
  gate: GateMode;
  /** Scopes included in the effective score (repo is always first). */
  effectiveScopes: Array<'repo' | 'user' | 'system' | string>;
  extends: string[];
  rules: Record<string, Severity>;
}

/** Default configuration when the repository supplies no overrides. */
export const DEFAULT_CONFIG: HarnessScoreConfig = {
  scan: { includePaths: [] },
  scopes: { user: false, system: false },
  extraRoots: [],
  gate: 'maturity',
  extends: [],
  rules: {},
};

/** Name of the repository configuration file. */
export const CONFIG_FILENAME = '.harness-score.json';

/**
 * Built-in, maintainer-curated presets — the ESLint-flavored alternative to
 * free-form per-repo waivers. Each preset is a named, versioned, PR-reviewed
 * bundle of severity overrides (see CONTRIBUTING.md "Proposing a preset").
 * `no-hooks` is derived from ALL_CHECKS rather than hardcoded IDs so it never
 * drifts if the hooks dimension gains a check.
 */
export const PRESET_REGISTRY: Record<string, Record<string, Severity>> = {
  'no-hooks': Object.fromEntries(
    ALL_CHECKS.filter((c) => c.dimension === 'hooks').map((c) => [c.id, 'off' as const]),
  ),
};

const ALLOWED_TOP_KEYS = new Set(['scan', 'scopes', 'extraRoots', 'gate', 'extends', 'rules']);
const ALLOWED_SCOPE_KEYS = new Set(['user', 'system']);
const ALLOWED_SCAN_KEYS = new Set(['includePaths']);
const VALID_SEVERITIES = new Set(['off', 'error']);
const CHECK_IDS = new Set(ALL_CHECKS.map((c) => c.id));

/**
 * Checks that detect actively leaked/exposed credentials — never eligible for
 * "off", from either a local `rules` override or a preset, regardless of how
 * the exclusion is justified. This is the one thing "customizable, but still
 * serious" can't bend on: nothing in this config format may silence an actual
 * secret-leak detector, only disclosure-and-review protects everything else.
 */
export const PROTECTED_CHECKS: Set<string> = new Set(['HYG-03', 'HYG-04', 'HYG-06']);

/** Optional command-line overrides applied when resolving configuration. */
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

function parseScan(value: unknown, source: string): ScanConfig {
  if (value === undefined) return { includePaths: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    configError(`${source}: scan must be an object`);
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_SCAN_KEYS.has(key)) configError(`${source}: unknown scan key "${key}"`);
  }
  const paths = obj.includePaths;
  if (paths === undefined) return { includePaths: [] };
  if (!Array.isArray(paths)) configError(`${source}.scan.includePaths must be an array`);

  const normalized = new Set<string>();
  paths.forEach((entry, index) => {
    const label = `${source}.scan.includePaths[${index}]`;
    if (typeof entry !== 'string' || entry.trim() === '') {
      configError(`${label}: must be a non-empty relative path`);
    }
    if (
      entry.startsWith('/') ||
      /^[A-Za-z]:/.test(entry) ||
      entry.includes('\\') ||
      ['*', '?', '{', '}', '[', ']'].some((character) => entry.includes(character))
    ) {
      configError(`${label}: must be an exact repo-relative path using forward slashes`);
    }
    const segments = entry.split('/');
    if (
      segments.some((segment) => segment === '' || segment === '.' || segment === '..' || segment === '.git')
    ) {
      configError(`${label}: empty, ".", "..", and ".git" path segments are not allowed`);
    }
    normalized.add(segments.join('/'));
  });
  return { includePaths: [...normalized].sort() };
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

function parseExtends(value: unknown, source: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) configError(`${source}: extends must be an array`);
  return value.map((entry, index) => {
    const label = `${source}.extends[${index}]`;
    if (typeof entry !== 'string' || entry.trim() === '') {
      configError(`${label}: must be a non-empty string`);
    }
    if (!Object.hasOwn(PRESET_REGISTRY, entry)) {
      configError(
        `${label}: unknown preset "${entry}" (known presets: ${Object.keys(PRESET_REGISTRY).join(', ') || 'none'})`,
      );
    }
    return entry;
  });
}

function parseSeverityValue(value: unknown, source: string, checkId: string): Severity {
  if (value === 'warn') {
    configError(
      `${source}.rules["${checkId}"]: severity "warn" is not supported yet (only "off" and "error")`,
    );
  }
  if (typeof value !== 'string' || !VALID_SEVERITIES.has(value)) {
    configError(`${source}.rules["${checkId}"]: severity must be "off" or "error"`);
  }
  return value as Severity;
}

function parseRules(value: unknown, source: string): Record<string, Severity> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    configError(`${source}: rules must be an object`);
  }
  const obj = value as Record<string, unknown>;
  const rules: Record<string, Severity> = {};
  for (const [checkId, severity] of Object.entries(obj)) {
    if (!CHECK_IDS.has(checkId)) {
      configError(`${source}.rules: unknown check ID "${checkId}"`);
    }
    const parsed = parseSeverityValue(severity, source, checkId);
    if (parsed === 'off' && PROTECTED_CHECKS.has(checkId)) {
      configError(
        `${source}.rules["${checkId}"]: this check detects leaked/exposed credentials and can never be set to "off"`,
      );
    }
    rules[checkId] = parsed;
  }
  return rules;
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
    scan: parseScan(obj.scan, source),
    scopes: parseScopes(obj.scopes, source),
    extraRoots: parseExtraRoots(obj.extraRoots, source),
    gate: obj.gate === undefined ? 'maturity' : parseGate(obj.gate, source),
    extends: parseExtends(obj.extends, source),
    rules: parseRules(obj.rules, source),
  };
}

/** Effective check severity and its source. */
export interface ResolvedSeverity {
  severity: Severity;
  source: 'default' | string;
}

/**
 * Resolves the final severity for every check: default 'error' → each preset
 * in `extends`, applied in array order → `rules` local overrides, applied
 * last (highest precedence). Map insertion order follows ALL_CHECKS order and
 * is never disturbed by later overwrites, keeping output deterministic.
 */
export function resolveSeverities(cfg: {
  extends: string[];
  rules: Record<string, Severity>;
}): Map<string, ResolvedSeverity> {
  const resolved = new Map<string, ResolvedSeverity>();
  for (const check of ALL_CHECKS) {
    resolved.set(check.id, { severity: 'error', source: 'default' });
  }
  for (const presetName of cfg.extends) {
    const preset = PRESET_REGISTRY[presetName];
    if (!preset) continue;
    for (const [checkId, severity] of Object.entries(preset)) {
      resolved.set(checkId, { severity, source: `extends:${presetName}` });
    }
  }
  for (const [checkId, severity] of Object.entries(cfg.rules)) {
    resolved.set(checkId, { severity, source: 'rules' });
  }
  return resolved;
}

/** Read and validate a JSON configuration file; throws on invalid input. */
export function loadConfigFile(configPath: string): HarnessScoreConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    configError(`could not read/parse ${configPath}: ${String(error)}`);
  }
  return parseConfigObject(raw, configPath);
}

/** Load the repository's configuration file, or return null if it does not exist. */
export function discoverConfig(repoRoot: string): HarnessScoreConfig | null {
  const configPath = path.join(repoRoot, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) return null;
  return loadConfigFile(configPath);
}

/** Parse a comma-separated list of user and system scopes, rejecting unknown values. */
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
  let base: HarnessScoreConfig = {
    ...DEFAULT_CONFIG,
    scan: { ...DEFAULT_CONFIG.scan!, includePaths: [...DEFAULT_CONFIG.scan!.includePaths] },
    scopes: { ...DEFAULT_CONFIG.scopes },
    extraRoots: [],
    extends: [],
    rules: {},
  };

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
    scan: base.scan,
    scopes: { user, system },
    extraRoots: base.extraRoots,
    gate,
    effectiveScopes,
    extends: base.extends,
    rules: base.rules,
  };
}
