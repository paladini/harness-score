#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORY_TITLES = new Map([
  ['Major Changes', 'Breaking changes'],
  ['Minor Changes', 'New features'],
  ['Patch Changes', 'Fixes and improvements'],
]);
const CREDIT_PATTERN = /Thanks(?:\s+also)?\s+to\s+\[@([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)[^.]*\./gi;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export function extractReleaseSection(changelog, version) {
  const lines = changelog.replaceAll('\r\n', '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) {
    throw new Error(`CHANGELOG.md has no section for ${version}.`);
  }

  const next = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines
    .slice(start + 1, next === -1 ? undefined : next)
    .join('\n')
    .trim();
}

export function extractContributors(section) {
  const contributors = new Map();
  for (const match of section.matchAll(new RegExp(CREDIT_PATTERN.source, CREDIT_PATTERN.flags))) {
    contributors.set(match[1], match[2]);
  }
  return [...contributors].map(([handle, url]) => ({ handle, url }));
}

function formatChanges(section) {
  return section
    .replace(new RegExp(CREDIT_PATTERN.source, CREDIT_PATTERN.flags), '')
    .replace(/^(\s*-\s+)[0-9a-f]{7,40}:\s+/gim, '$1')
    .replace(/^### (Major Changes|Minor Changes|Patch Changes)$/gm, (_, category) => {
      return `#### ${CATEGORY_TITLES.get(category)}`;
    })
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countTopLevelChanges(changes) {
  return changes.split('\n').filter((line) => line.startsWith('- ')).length;
}

export function generateReleaseNotes({ version, section, summary }) {
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Expected a stable X.Y.Z version, received "${version}".`);
  }

  const changes = formatChanges(section);
  const contributors = extractContributors(section);
  const changeCount = countTopLevelChanges(changes);
  const introduction =
    summary?.trim() ||
    `Harness Score v${version} includes ${changeCount} ${
      changeCount === 1 ? 'user-facing improvement' : 'user-facing improvements'
    }.`;
  const major = version.split('.')[0];
  const contributorSection = contributors.length
    ? [
        '',
        '### Contributors',
        '',
        ...contributors.map(
          ({ handle, url }) => `- Thanks to [@${handle}](${url}) for helping improve Harness Score.`,
        ),
      ]
    : [];

  return [
    `## Harness Score v${version}`,
    '',
    introduction,
    '',
    '### What changed',
    '',
    changes,
    '',
    '### Install or upgrade',
    '',
    '```bash',
    'npx --yes harness-score',
    '```',
    '',
    'For GitHub Actions:',
    '',
    '```yaml',
    `- uses: paladini/harness-score@v${major}`,
    '```',
    '',
    '### Published artifacts',
    '',
    `- [npm: \`harness-score@${version}\`](https://www.npmjs.com/package/harness-score/v/${version})`,
    `- [JSR: \`@paladini/harness-score@${version}\`](https://jsr.io/@paladini/harness-score@${version})`,
    `- [GitHub Action: \`paladini/harness-score@v${major}\`](https://github.com/marketplace/actions/harness-score)`,
    `- [GitHub Packages: \`@paladini/harness-score@${version}\`](https://github.com/paladini/harness-score/packages)`,
    ...contributorSection,
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { output: undefined, summary: undefined, version: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      options.help = true;
      continue;
    }
    if (argument === '--stdout') {
      options.stdout = true;
      continue;
    }
    if (['--output', '--summary', '--version'].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/release-notes.mjs [options]

Options:
  --version X.Y.Z    Version to render (defaults to packages/cli/package.json)
  --summary TEXT     One-sentence release introduction
  --output PATH      Output path (defaults to .release/release-notes-vX.Y.Z.md)
  --stdout           Print the notes instead of writing a file
  --help             Show this help`);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'cli', 'package.json'), 'utf8'));
  const version = options.version ?? packageJson.version;
  const changelog = fs.readFileSync(path.join(ROOT, 'packages', 'cli', 'CHANGELOG.md'), 'utf8');
  const section = extractReleaseSection(changelog, version);
  const notes = generateReleaseNotes({ version, section, summary: options.summary });

  if (options.stdout) {
    process.stdout.write(notes);
    return;
  }

  const output = path.resolve(ROOT, options.output ?? path.join('.release', `release-notes-v${version}.md`));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, notes);
  console.log(`Wrote release notes to ${path.relative(ROOT, output)}.`);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
