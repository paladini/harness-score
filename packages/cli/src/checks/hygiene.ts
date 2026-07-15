import { collectHarnessTextFiles } from '../harness/collectors.js';
import { mcpConfigPaths } from '../harness/mcp.js';
import type { Check, ScanContext } from '../types.js';
import { findSecret, safeJsonParse } from '../util.js';
import { detectEcosystems } from './sensors.js';

const ENV_FILE_RE = /(^|\/)\.env(\.[^/]+)?$/;
const ENV_TEMPLATE_RE = /\.(example|sample|template|dist)$/;
const CREDENTIAL_WORDS = new Set(['token', 'key', 'secret', 'password', 'passwd', 'auth', 'apikey']);
const ENV_INTERPOLATION_RE = /\$\{[A-Za-z_][A-Za-z0-9_]*\}/;

/**
 * A key is credential-shaped only if one of its camelCase/snake_case/kebab-case
 * segments is a credential word (allowing a simple trailing-"s" plural, since
 * an array of secrets is commonly named "apiKeys"/"tokens") — "apiKey" and
 * "API_TOKENS" match, but "authorName" and "keyword" don't (substring
 * matching flagged those).
 */
function isCredentialShapedKey(key: string): boolean {
  const segments = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[_\-\s]+/)
    .map((s) => s.toLowerCase())
    .filter(Boolean);
  return segments.some(
    (s) => CREDENTIAL_WORDS.has(s) || (s.endsWith('s') && CREDENTIAL_WORDS.has(s.slice(0, -1))),
  );
}

/**
 * Recursively collect stringified values of credential-shaped keys
 * (token/key/secret/password/…). An array found under a credential-shaped
 * key is treated as a list of credential values itself — not recursed into
 * generically — so e.g. `"apiKeys": ["sk-...", "sk-..."]` still surfaces
 * both literals instead of losing the key context on recursion.
 */
function credentialShapedValues(node: unknown, keyIsCredential = false): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item) => {
      if (
        keyIsCredential &&
        (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
      ) {
        return [String(item)];
      }
      return credentialShapedValues(item);
    });
  }
  if (!node || typeof node !== 'object') return [];
  const values: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const credential = isCredentialShapedKey(key);
    if (
      credential &&
      (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    ) {
      values.push(String(value));
    } else if (Array.isArray(value)) {
      values.push(...credentialShapedValues(value, credential));
    } else if (value && typeof value === 'object') {
      values.push(...credentialShapedValues(value));
    }
  }
  return values;
}

function gitignoreCoversEnv(ctx: ScanContext): boolean {
  const content = ctx.read('.gitignore');
  if (content === null) return false;
  return content.split(/\r?\n/).some((l) => /^\s*\*?\*?\/?\.env/.test(l.trim()));
}

const LOCKFILES: Array<{ file: string; ecosystems: string[] }> = [
  { file: 'package-lock.json', ecosystems: ['node'] },
  { file: 'pnpm-lock.yaml', ecosystems: ['node'] },
  { file: 'yarn.lock', ecosystems: ['node'] },
  { file: 'bun.lockb', ecosystems: ['node'] },
  { file: 'bun.lock', ecosystems: ['node'] },
  { file: 'uv.lock', ecosystems: ['python'] },
  { file: 'poetry.lock', ecosystems: ['python'] },
  { file: 'Pipfile.lock', ecosystems: ['python'] },
  { file: 'requirements.txt', ecosystems: ['python'] },
  { file: 'go.sum', ecosystems: ['go'] },
  { file: 'Cargo.lock', ecosystems: ['rust'] },
  { file: 'composer.lock', ecosystems: ['php'] },
  { file: 'Gemfile.lock', ecosystems: ['ruby'] },
];

export const hygieneChecks: Check[] = [
  {
    id: 'HYG-01',
    dimension: 'hygiene',
    title: '.gitignore present',
    points: 2,
    remediation:
      'Add a .gitignore — agents commit what they see; make sure build output and local state are invisible.',
    run(ctx) {
      return ctx.has('.gitignore')
        ? { passed: true, evidence: '.gitignore found at repository root.' }
        : { passed: false, evidence: 'No .gitignore at repository root.' };
    },
  },
  {
    id: 'HYG-02',
    dimension: 'hygiene',
    title: '.gitignore covers environment files',
    points: 3,
    remediation: 'Add ".env" and ".env.*" to .gitignore so an agent can never stage credentials by accident.',
    run(ctx) {
      if (!ctx.has('.gitignore')) {
        return { passed: false, evidence: 'No .gitignore to inspect.' };
      }
      return gitignoreCoversEnv(ctx)
        ? { passed: true, evidence: '.gitignore contains a .env pattern.' }
        : { passed: false, evidence: '.gitignore has no .env pattern.' };
    },
  },
  {
    id: 'HYG-03',
    dimension: 'hygiene',
    title: 'No unprotected .env files in the tree',
    points: 4,
    remediation:
      "Remove committed .env files (keep only .env.example) or at minimum ensure .gitignore excludes them — env files in an agent's working tree leak into context and commits.",
    run(ctx) {
      const envFiles = ctx.files.filter((f) => ENV_FILE_RE.test(f) && !ENV_TEMPLATE_RE.test(f));
      if (envFiles.length === 0) {
        return {
          passed: true,
          evidence: 'No real .env files in the tree (templates like .env.example are fine).',
        };
      }
      const covered = gitignoreCoversEnv(ctx);
      return covered
        ? { passed: true, evidence: `${envFiles.length} .env file(s) present but covered by .gitignore.` }
        : { passed: false, evidence: `Unignored env file(s): ${envFiles.slice(0, 3).join(', ')}.` };
    },
  },
  {
    id: 'HYG-04',
    dimension: 'hygiene',
    title: 'MCP configuration free of credentials',
    points: 4,
    remediation:
      'Never inline API keys in MCP config (.cursor/mcp.json, .mcp.json, .agents/mcp_config.json) — use ${VAR} interpolation and document required variables in .env.example.',
    run(ctx) {
      const mcpFiles = mcpConfigPaths(ctx);
      if (mcpFiles.length === 0) {
        return { passed: true, evidence: 'No MCP config in repository (nothing to leak).' };
      }
      for (const file of mcpFiles) {
        const content = ctx.read(file) ?? '';
        const secret = findSecret(content);
        if (secret) {
          return { passed: false, evidence: `${file} contains what looks like a ${secret}.` };
        }
      }
      return { passed: true, evidence: `${mcpFiles.join(', ')}: no credential signatures found.` };
    },
  },
  {
    id: 'HYG-05',
    dimension: 'hygiene',
    title: 'License present',
    points: 2,
    remediation: 'Add a LICENSE file — required for open-source distribution and plugin marketplaces.',
    run(ctx) {
      const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'].find((f) => ctx.has(f));
      return license
        ? { passed: true, evidence: `Found ${license}.` }
        : { passed: false, evidence: 'No LICENSE file at repository root.' };
    },
  },
  {
    id: 'HYG-06',
    dimension: 'hygiene',
    title: 'No credential signatures in harness files',
    points: 2,
    remediation:
      'Remove any API keys or tokens from AGENTS.md, rules, and hooks configuration — harness files are loaded into model context on every session.',
    run(ctx) {
      const harnessFiles = collectHarnessTextFiles(ctx);
      for (const file of harnessFiles) {
        const secret = findSecret(ctx.read(file) ?? '');
        if (secret) {
          return { passed: false, evidence: `${file} contains what looks like a ${secret}.` };
        }
      }
      return {
        passed: true,
        evidence:
          harnessFiles.length > 0
            ? `Scanned ${harnessFiles.length} harness file(s); no credential signatures.`
            : 'No harness files present to scan.',
      };
    },
  },
  {
    id: 'HYG-07',
    dimension: 'hygiene',
    title: 'Dependency lockfile committed',
    points: 3,
    remediation:
      "Commit the lockfile (package-lock.json, uv.lock, Cargo.lock…) — reproducible installs mean the agent's sensors run against the same dependencies everywhere.",
    run(ctx) {
      const ecosystems = detectEcosystems(ctx);
      const lockable = LOCKFILES.filter((l) =>
        l.ecosystems.some((e) => (ecosystems as string[]).includes(e)),
      );
      if (lockable.length === 0) {
        return {
          passed: true,
          evidence:
            ecosystems.length === 0
              ? 'No dependency manifest detected (nothing to lock).'
              : `No lockfile convention applies to: ${ecosystems.join(', ')}.`,
        };
      }
      const found = lockable.find((l) => ctx.has(l.file));
      return found
        ? { passed: true, evidence: `Found ${found.file}.` }
        : {
            passed: false,
            evidence: `Manifest present but no lockfile (expected one of: ${[...new Set(lockable.map((l) => l.file))].join(', ')}).`,
          };
    },
  },
  {
    id: 'HYG-08',
    dimension: 'hygiene',
    title: 'MCP config uses env interpolation for credentials',
    points: 3,
    remediation:
      'Reference credential-shaped values in MCP config via ${ENV_VAR} interpolation instead of literals — this rewards deliberate, safe tool-access configuration.',
    run(ctx) {
      const mcpFiles = mcpConfigPaths(ctx);
      if (mcpFiles.length === 0) {
        return {
          passed: false,
          evidence: 'No MCP config found (.cursor/mcp.json, .mcp.json, or .agents/mcp_config.json).',
        };
      }
      for (const file of mcpFiles) {
        const content = ctx.read(file) ?? '';
        if (findSecret(content)) {
          return { passed: false, evidence: `${file} contains a literal credential signature (see HYG-04).` };
        }
        const parsed = safeJsonParse(content);
        if (parsed === undefined) {
          return { passed: false, evidence: `${file} is not valid JSON.` };
        }
        const credentialValues = credentialShapedValues(parsed);
        const uninterpolated = credentialValues.filter((v) => !ENV_INTERPOLATION_RE.test(v));
        if (uninterpolated.length > 0) {
          return {
            passed: false,
            evidence: `${file} has credential-shaped field(s) not using \${VAR} interpolation.`,
          };
        }
      }
      return {
        passed: true,
        evidence: `${mcpFiles.join(', ')}: valid, and any credential-shaped fields use \${VAR} interpolation.`,
      };
    },
  },
];
