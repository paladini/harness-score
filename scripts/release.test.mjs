import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractContributors, extractReleaseSection, generateReleaseNotes } from './release-notes.mjs';
import { validateRepositoryRelease } from './validate-release.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('extracts one changelog release without leaking the previous release', () => {
  const changelog = '# package\n\n## 2.0.0\n\n### Major Changes\n\n- New API.\n\n## 1.0.0\n\n- Old API.\n';
  const section = extractReleaseSection(changelog, '2.0.0');

  assert.match(section, /New API/);
  assert.doesNotMatch(section, /Old API/);
});

test('renders polished notes and promotes contributor credit', () => {
  const section = `### Patch Changes

- abc1234: Fix generated files.

  Thanks to [@contributor](https://github.com/contributor) for contributing this fix.`;
  const notes = generateReleaseNotes({
    version: '1.2.3',
    section,
    summary: 'Generated project state no longer disrupts scans.',
  });

  assert.match(notes, /^## Harness Score v1\.2\.3/m);
  assert.match(notes, /#### Fixes and improvements/);
  assert.match(notes, /- Fix generated files\./);
  assert.doesNotMatch(notes, /abc1234:/);
  assert.match(notes, /### Contributors/);
  assert.equal(notes.match(/@contributor/g)?.length, 1);
  assert.match(notes, /paladini\/harness-score@v1/);
});

test('deduplicates contributor handles', () => {
  const contributors = extractContributors(`Thanks to [@person](https://github.com/person) for one fix.

Thanks also to [@person](https://github.com/person) for another fix.`);

  assert.deepEqual(contributors, [{ handle: 'person', url: 'https://github.com/person' }]);
});

test('validates the repository release surfaces and contributor notes', () => {
  const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'packages', 'cli', 'package.json'), 'utf8'));
  const body = generateReleaseNotes({
    version: packageJson.version,
    section: extractReleaseSection(
      readFileSync(path.join(ROOT, 'packages', 'cli', 'CHANGELOG.md'), 'utf8'),
      packageJson.version,
    ),
    summary: 'A tested release.',
  });
  const result = validateRepositoryRelease({
    expectedVersion: packageJson.version,
    releaseBody: body,
    root: ROOT,
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.contributors.map(({ handle }) => handle),
    ['PAHJunior'],
  );
});

test('rejects release notes that omit required contributor credit', () => {
  const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'packages', 'cli', 'package.json'), 'utf8'));
  const result = validateRepositoryRelease({
    expectedVersion: packageJson.version,
    releaseBody: `Harness Score v${packageJson.version}`,
    root: ROOT,
  });

  assert.ok(result.errors.some((error) => error.includes('@PAHJunior')));
});

test('publishes only after a release event and moves the stable tag after registries', () => {
  const workflow = readFileSync(path.join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8');

  assert.match(workflow, /types: \[published\]/);
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.match(workflow, /needs: \[validate, npm, github-packages, jsr\]/);
  assert.match(workflow, /Verify Marketplace publication/);
  assert.match(workflow, /git push origin "refs\/tags\/\$MAJOR_TAG" --force/);
});

test('prepares a reviewed draft instead of publishing directly', () => {
  const workflow = readFileSync(path.join(ROOT, '.github', 'workflows', 'prepare-release.yml'), 'utf8');

  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /node scripts\/validate-release\.mjs/);
  assert.match(workflow, /node scripts\/release-notes\.mjs/);
  assert.match(workflow, /gh release create "\$TAG"/);
  assert.match(workflow, /--draft/);
  assert.doesNotMatch(workflow, /npm publish/);
});
