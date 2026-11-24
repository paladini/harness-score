import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { RULES } from '../src/references/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SPEC = fs.readFileSync(path.join(here, '..', 'REFERENCE-CHECK.md'), 'utf8');

/** Rule ids listed in the first column of the rules table. */
function documentedRules(): string[] {
  return SPEC.split(/\r?\n/)
    .map((line) => /^\| `([a-z]+\.[a-z-]+)` \|/.exec(line)?.[1])
    .filter((id): id is string => id !== undefined);
}

describe('REFERENCE-CHECK.md stays in sync with the code', () => {
  test('every rule the code can produce is documented, once', () => {
    const documented = documentedRules();
    expect(new Set(documented).size).toBe(documented.length);
    expect([...documented].sort()).toEqual([...Object.values(RULES)].sort());
  });

  test('rule ids follow the subject.outcome naming', () => {
    for (const rule of Object.values(RULES)) expect(rule).toMatch(/^[a-z]+\.[a-z]+(?:-[a-z]+)*$/);
  });
});
