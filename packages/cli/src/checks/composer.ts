import type { ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';

const COMPOSER_JSON_RE = /(^|\/)composer\.json$/;

const COMPOSER_BUILTIN_COMMANDS = new Set([
  'about',
  'archive',
  'audit',
  'browse',
  'clear-cache',
  'clearcache',
  'config',
  'create-project',
  'createproject',
  'depends',
  'diagnose',
  'dump-autoload',
  'dumpautoload',
  'exec',
  'fund',
  'global',
  'help',
  'init',
  'install',
  'licenses',
  'list',
  'outdated',
  'prohibits',
  'reinstall',
  'remove',
  'require',
  'run',
  'run-script',
  'runscript',
  'search',
  'self-update',
  'selfupdate',
  'show',
  'status',
  'suggests',
  'update',
  'validate',
  'why',
  'why-not',
]);

export function eachComposerJson(ctx: ScanContext): Record<string, unknown>[] {
  const paths = ctx.matching(COMPOSER_JSON_RE);
  const out: Record<string, unknown>[] = [];
  for (const p of paths) {
    const content = ctx.read(p);
    const parsed = content ? safeJsonParse(content) : null;
    if (parsed && typeof parsed === 'object') out.push(parsed as Record<string, unknown>);
  }
  return out;
}

export function hasComposerPackage(ctx: ScanContext, name: string): boolean {
  for (const pkg of eachComposerJson(ctx)) {
    const req = pkg.require as Record<string, unknown> | undefined;
    const dev = pkg['require-dev'] as Record<string, unknown> | undefined;
    if (req?.[name] !== undefined || dev?.[name] !== undefined) return true;
  }
  return false;
}

function mergedComposerScripts(ctx: ScanContext): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const pkg of eachComposerJson(ctx)) {
    const scripts = pkg.scripts;
    if (!scripts || typeof scripts !== 'object') continue;
    for (const [key, value] of Object.entries(scripts as Record<string, unknown>)) {
      if (typeof value === 'string') merged[key] = value;
    }
  }
  return merged;
}

/** Append composer script bodies referenced in CI YAML/text so tool names inside scripts are visible. */
export function expandCiWithComposerScripts(ciRaw: string, ctx: ScanContext): string {
  const scripts = mergedComposerScripts(ctx);
  if (Object.keys(scripts).length === 0) return ciRaw;

  const names = new Set<string>();
  const runScriptRe = /composer(?:\s+run-script|\s+run)\s+([a-zA-Z0-9_-]+)/gi;
  for (const match of ciRaw.matchAll(runScriptRe)) {
    names.add(match[1]!);
  }
  const directRe = /\bcomposer\s+([a-zA-Z][a-zA-Z0-9_-]*)\b/gi;
  for (const match of ciRaw.matchAll(directRe)) {
    const cmd = match[1]!.toLowerCase();
    if (!COMPOSER_BUILTIN_COMMANDS.has(cmd)) names.add(match[1]!);
  }

  let expanded = ciRaw;
  for (const name of names) {
    const body = scripts[name];
    if (body) expanded += `\n${body}`;
  }
  return expanded;
}
