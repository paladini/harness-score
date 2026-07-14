#!/usr/bin/env node
/**
 * Mirrors packages/cli/package.json's version into the two other places
 * RELEASING.md requires it to match: TOOL_VERSION in score.ts and the
 * version field in jsr.json. Run by hand after `npx changeset version`
 * (which only bumps package.json + CHANGELOG.md) and before committing a
 * release — changesets doesn't know about either of these project-specific
 * files, so this closes that gap rather than asking a maintainer to keep
 * three files in sync by memory.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'cli');

const pkgPath = path.join(CLI_DIR, 'package.json');
const scorePath = path.join(CLI_DIR, 'src', 'score.ts');
const jsrPath = path.join(CLI_DIR, 'jsr.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
if (!version) {
  console.error('packages/cli/package.json has no "version" field.');
  process.exit(1);
}

const scoreSrc = fs.readFileSync(scorePath, 'utf8');
const toolVersionRe = /export const TOOL_VERSION = '[^']+';/;
if (!toolVersionRe.test(scoreSrc)) {
  console.error("Could not find `export const TOOL_VERSION = '...';` in score.ts.");
  process.exit(1);
}
fs.writeFileSync(scorePath, scoreSrc.replace(toolVersionRe, `export const TOOL_VERSION = '${version}';`));

const jsr = JSON.parse(fs.readFileSync(jsrPath, 'utf8'));
jsr.version = version;
fs.writeFileSync(jsrPath, `${JSON.stringify(jsr, null, 2)}\n`);

console.log(`Synced TOOL_VERSION and jsr.json to ${version}.`);
