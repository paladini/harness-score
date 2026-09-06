#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractContributors, extractReleaseSection } from './release-notes.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function actionVersion(metadata, fileName, errors) {
  const match = metadata.match(/(^ {2}version:\r?\n(?: {4}.+\r?\n)+? {4}default: ')([^']+)(')/m);
  if (!match) {
    errors.push(`${fileName}: could not find the version input default.`);
    return undefined;
  }
  return match[2];
}

export function validateRepositoryRelease({ root = ROOT, expectedVersion, releaseBody }) {
  const errors = [];
  if (!SEMVER_PATTERN.test(expectedVersion)) {
    errors.push(`Expected a stable X.Y.Z version, received "${expectedVersion}".`);
  }

  const cliPackage = readJson(path.join(root, 'packages', 'cli', 'package.json'));
  const jsr = readJson(path.join(root, 'packages', 'cli', 'jsr.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  const score = fs.readFileSync(path.join(root, 'packages', 'cli', 'src', 'score.ts'), 'utf8');
  const rootAction = fs.readFileSync(path.join(root, 'action.yml'), 'utf8');
  const nestedAction = fs.readFileSync(path.join(root, 'action', 'action.yml'), 'utf8');
  const actionReadme = fs.readFileSync(path.join(root, 'action', 'README.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'packages', 'cli', 'CHANGELOG.md'), 'utf8');
  const scoreVersion = score.match(/export const TOOL_VERSION = '([^']+)';/)?.[1];
  const versions = new Map([
    ['packages/cli/package.json', cliPackage.version],
    ['packages/cli/jsr.json', jsr.version],
    ['package-lock.json workspace entry', lock.packages?.['packages/cli']?.version],
    ['packages/cli/src/score.ts TOOL_VERSION', scoreVersion],
    ['action.yml version input', actionVersion(rootAction, 'action.yml', errors)],
    ['action/action.yml version input', actionVersion(nestedAction, 'action/action.yml', errors)],
  ]);

  for (const [surface, version] of versions) {
    if (version !== expectedVersion) {
      errors.push(`${surface}: expected ${expectedVersion}, found ${version ?? 'nothing'}.`);
    }
  }

  if (rootAction !== nestedAction) {
    errors.push('action.yml and action/action.yml must remain byte-identical.');
  }
  if (!actionReadme.includes(`| \`version\` | \`${expectedVersion}\` |`)) {
    errors.push(`action/README.md: version input row is not ${expectedVersion}.`);
  }

  let section = '';
  try {
    section = extractReleaseSection(changelog, expectedVersion);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const contributors = extractContributors(section);
  if (releaseBody !== undefined) {
    const requiredFragments = [
      `Harness Score v${expectedVersion}`,
      '### What changed',
      '### Install or upgrade',
      '### Published artifacts',
      'npx --yes harness-score',
      `paladini/harness-score@v${expectedVersion.split('.')[0]}`,
    ];
    for (const fragment of requiredFragments) {
      if (!releaseBody.includes(fragment)) {
        errors.push(`GitHub release notes are missing: ${fragment}`);
      }
    }
    for (const { handle } of contributors) {
      if (!releaseBody.includes(`@${handle}`)) {
        errors.push(`GitHub release notes do not credit @${handle}.`);
      }
    }
  }

  return { contributors, errors, version: expectedVersion };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--release-body', '--version'].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value.`);
      options[argument === '--release-body' ? 'releaseBodyPath' : 'version'] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.version) throw new Error('--version is required.');
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const releaseBody = options.releaseBodyPath
    ? fs.readFileSync(path.resolve(options.releaseBodyPath), 'utf8')
    : undefined;
  const result = validateRepositoryRelease({
    expectedVersion: options.version,
    releaseBody,
  });

  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`Release validation failed with ${result.errors.length} error(s).`);
  }

  const credit = result.contributors.length
    ? ` Contributor credit: ${result.contributors.map(({ handle }) => `@${handle}`).join(', ')}.`
    : '';
  console.log(`Release ${result.version} is internally consistent.${credit}`);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
