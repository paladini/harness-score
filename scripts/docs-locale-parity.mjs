import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAINTAINED_LOCALES = ['en', 'pt-BR', 'es', 'zh-CN', 'hi-IN'];

function localizedPage(path) {
  if (path === 'docs/index.md') return 'index.md';

  const englishGuide = path.match(/^docs\/guide\/(.+\.md)$/);
  if (englishGuide) return `guide/${englishGuide[1]}`;

  for (const locale of MAINTAINED_LOCALES.filter((item) => item !== 'en')) {
    if (path === `docs/${locale}/index.md`) return 'index.md';
    const localizedGuide = path.match(new RegExp(`^docs/${locale}/guide/(.+\\.md)$`));
    if (localizedGuide) return `guide/${localizedGuide[1]}`;
  }

  return null;
}

function localePath(locale, relativePath) {
  return locale === 'en' ? `docs/${relativePath}` : `docs/${locale}/${relativePath}`;
}

export function findMissingLocalePaths(changedPaths) {
  const changed = new Set(changedPaths);
  const pages = new Set(changedPaths.map((path) => localizedPage(path)).filter((page) => page !== null));
  const missing = [];

  for (const page of pages) {
    for (const locale of MAINTAINED_LOCALES) {
      const expectedPath = localePath(locale, page);
      if (!changed.has(expectedPath)) missing.push(expectedPath);
    }
  }

  return missing.sort();
}

function getStagedPaths() {
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '-z', '--no-renames'], {
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(`Could not run git to inspect staged files: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Could not inspect staged files with git: ${result.stderr.trim()}`);
  }

  return result.stdout.split('\0').filter(Boolean);
}

export function main() {
  const missing = findMissingLocalePaths(getStagedPaths());
  if (missing.length === 0) return 0;

  console.error(
    '[docs-i18n] Commit blocked: stage the matching documentation file in every maintained locale.',
  );
  console.error('Missing staged counterparts:');
  for (const path of missing) console.error(`  - ${path}`);
  console.error('Update those files as appropriate, then stage them with `git add`.');
  console.error('This check verifies file-level coverage; it does not translate or compare content.');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`[docs-i18n] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
