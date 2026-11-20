/**
 * Minimal glob matcher for repository-relative POSIX paths.
 *
 * Supported: literal segments, `*` (within one segment), `?` (one code point
 * within one segment) and `**` as a whole segment (any number of segments).
 * Anything else that glob dialects give special meaning to is reported as
 * unsupported rather than guessed at. Patterns are expected to be normalized
 * already (no `./`, no `..`, `/` separators); matching is case-sensitive and
 * does not treat dotfiles specially.
 */

export type GlobUnsupportedReason =
  | 'empty'
  | 'negation'
  | 'backslash'
  | 'interpolation'
  | 'brace-expansion'
  | 'character-class';

export type GlobParse =
  | { supported: true; regex: RegExp }
  | { supported: false; reason: GlobUnsupportedReason };

const REGEX_SYNTAX_CHARS = /[\\^$.*+?()[\]{}|/]/;

function unsupportedReason(pattern: string): GlobUnsupportedReason | null {
  if (pattern === '') return 'empty';
  if (pattern.startsWith('!')) return 'negation';
  if (pattern.includes('\\')) return 'backslash';
  if (pattern.includes('$')) return 'interpolation';
  if (/[{}]/.test(pattern)) return 'brace-expansion';
  if (/[[\]]/.test(pattern)) return 'character-class';
  return null;
}

function translateSegment(segment: string): string {
  let out = '';
  let previousWasStar = false;
  // Iterate by code point so `?` consumes one whole character, emoji included.
  for (const ch of segment) {
    if (ch === '*') {
      if (!previousWasStar) out += '[^/]*';
      previousWasStar = true;
      continue;
    }
    previousWasStar = false;
    if (ch === '?') out += '[^/]';
    else out += REGEX_SYNTAX_CHARS.test(ch) ? `\\${ch}` : ch;
  }
  return out;
}

export function parseGlob(pattern: string): GlobParse {
  const reason = unsupportedReason(pattern);
  if (reason) return { supported: false, reason };

  const segments = pattern.split('/');
  const last = segments.length - 1;
  let source = '';
  segments.forEach((segment, i) => {
    if (segment === '**') {
      // A trailing `**` needs at least one segment; elsewhere it may match none.
      source += i < last ? '(?:[^/]+/)*' : '.+';
    } else {
      source += translateSegment(segment) + (i < last ? '/' : '');
    }
  });
  return { supported: true, regex: new RegExp(`^${source}$`, 'u') };
}

/** True/false when the pattern is supported, null when it is not. */
export function matchGlob(pattern: string, relPath: string): boolean | null {
  const parsed = parseGlob(pattern);
  return parsed.supported ? parsed.regex.test(relPath) : null;
}

/** Matching paths in input order, or null when the pattern is not supported. */
export function filterGlob(pattern: string, files: readonly string[]): string[] | null {
  const parsed = parseGlob(pattern);
  return parsed.supported ? files.filter((f) => parsed.regex.test(f)) : null;
}
