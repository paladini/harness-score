import { describe, expect, test } from 'vitest';
import { findSecret, parseFrontmatter, safeJsonParse } from '../src/util.js';

describe('parseFrontmatter', () => {
  test('plain single-line values still work', () => {
    const fm = parseFrontmatter('---\nname: deploy\ndescription: short one-liner\n---\nbody');
    expect(fm).toEqual({ name: 'deploy', description: 'short one-liner' });
  });

  test('folded block scalar (>) reconstructs the full sentence', () => {
    const content = `---
name: modular-architecture
description: >
  Fakeflix modular architecture expert. ALWAYS read this skill BEFORE proposing
  any fix or plan that involves module imports or cross-package dependencies.
---
body`;
    const fm = parseFrontmatter(content)!;
    expect(fm.name).toBe('modular-architecture');
    expect(fm.description.length).toBeGreaterThanOrEqual(40);
    expect(fm.description).toContain('ALWAYS read this skill BEFORE proposing any fix');
    expect(fm.description).not.toContain('\n');
  });

  test('literal block scalar (|) preserves internal newlines', () => {
    const content = `---
name: multiline
description: |
  line one
  line two
---
body`;
    const fm = parseFrontmatter(content)!;
    expect(fm.description).toBe('line one\nline two');
  });

  test('folded scalar treats a blank line as a paragraph break', () => {
    const content = `---
description: >
  first paragraph
  continues here.

  second paragraph.
---
body`;
    const fm = parseFrontmatter(content)!;
    expect(fm.description).toBe('first paragraph continues here.\nsecond paragraph.');
  });

  test('a key after a block scalar is parsed correctly', () => {
    const content = `---
description: >
  some text
globs: src/**
---
body`;
    const fm = parseFrontmatter(content)!;
    expect(fm.description).toBe('some text');
    expect(fm.globs).toBe('src/**');
  });
});

describe('findSecret', () => {
  test('detects a Google API key', () => {
    expect(findSecret('key: AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY')).toBe('Google API key');
  });

  test('detects a Slack incoming webhook URL', () => {
    expect(findSecret('https://hooks.slack.com/services/T00/B00/XXXXXXXXXXXXXXXXXXXXXXXX')).toBe(
      'Slack incoming webhook URL',
    );
  });

  test('detects a Stripe secret key', () => {
    expect(findSecret('sk_live_51H8xyzabcdefghijklmnop')).toBe('Stripe secret key');
  });

  test('does not flag clean content', () => {
    expect(findSecret('just some normal documentation text')).toBeNull();
  });
});

describe('safeJsonParse', () => {
  test('returns undefined on invalid JSON', () => {
    expect(safeJsonParse('{ not json')).toBeUndefined();
  });

  test('valid but falsy JSON round-trips as-is, not as a parse failure', () => {
    expect(safeJsonParse('false')).toBe(false);
    expect(safeJsonParse('null')).toBeNull();
    expect(safeJsonParse('0')).toBe(0);
    expect(safeJsonParse('""')).toBe('');
  });

  test('parses a normal object', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });
});
