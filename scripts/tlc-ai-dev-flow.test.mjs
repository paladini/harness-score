import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_ROOT = path.join(ROOT, '.agents', 'skills');
const LOCK_PATH = path.join(SKILLS_ROOT, 'tlc-ai-dev-flow.lock.json');

function filesUnder(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(absolute, relative) : [relative];
  });
}

test('pins a reproducible TLC AI Dev Flow source', () => {
  const lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));

  assert.equal(lock.source, 'https://github.com/tech-leads-club/agent-skills');
  assert.equal(lock.sourceRef, 'e7baf4217e57bbcd9cdddfa830546c6a013db845');
  assert.equal(lock.catalogPackage, '@tech-leads-club/agent-skills');
  assert.equal(lock.catalogPackageVersion, '1.4.10');
});

test('installs the complete four-skill core loop with matching metadata', () => {
  const lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
  const expectedNames = ['the-judge', 'tlc-discover', 'tlc-implement', 'tlc-plan'];

  assert.deepEqual(lock.skills.map(({ name }) => name).sort(), expectedNames);

  for (const skill of lock.skills) {
    const directory = path.join(SKILLS_ROOT, skill.name);
    const skillPath = path.join(directory, 'SKILL.md');

    assert.ok(existsSync(skillPath), `${skill.name} must include SKILL.md`);
    assert.deepEqual(filesUnder(directory).sort(), [...skill.files].sort());

    const source = readFileSync(skillPath, 'utf8');
    assert.match(source, new RegExp(`^name: ${skill.name}$`, 'm'));
    assert.match(source, new RegExp(`^  version: ${skill.version.replaceAll('.', '\\.')}$`, 'm'));
    assert.match(source, /^license: CC-BY-4\.0$/m);
  }
});
