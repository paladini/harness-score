/**
 * Path normalization for reference targets. Pure string work: it never touches
 * the filesystem and never resolves outside the repository root.
 *
 * Output paths are repository-relative, use `/`, carry no `.`/empty segments
 * and are NFC-normalized so they compare equal regardless of the Unicode form
 * a filesystem or editor stored the name in. Case is preserved: a link that
 * only resolves on a case-insensitive filesystem is not portable.
 */

import type { NotEvaluableReason } from './types.js';

export type NormalizeResult =
  | {
      kind: 'path';
      /** Repository-relative POSIX path; '' is the repository root. */
      path: string;
      /** True when the original explicitly named a directory (trailing `/`, `.` or `..`). */
      directoryHint: boolean;
    }
  | { kind: 'not-evaluable'; reason: NotEvaluableReason }
  | { kind: 'empty' };

export interface NormalizeOptions {
  /**
   * 'document': resolve from the directory of the source document.
   * 'root': resolve from the repository root; a leading `/` means the root.
   */
  base: 'document' | 'root';
  /** Directory of the source document, repository-relative POSIX ('' for the root). */
  sourceDir?: string;
}

const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]+:/;
const DRIVE_RE = /^[A-Za-z]:/;
const BRACED_OR_PLAIN_VAR_RE = /\$[A-Za-z_{]/;
const PERCENT_VAR_RE = /%[A-Za-z_][A-Za-z0-9_]*%/;
const PLACEHOLDER_RE = /<[\p{L}\p{N}_.-]+>/u;

function notEvaluable(reason: NotEvaluableReason): NormalizeResult {
  return { kind: 'not-evaluable', reason };
}

export function normalizeTarget(raw: string, options: NormalizeOptions): NormalizeResult {
  let target = raw.trim();
  if (target === '') return { kind: 'empty' };

  if (target.includes('`') || target.includes('$(')) return notEvaluable('execution-dependent');
  if (
    BRACED_OR_PLAIN_VAR_RE.test(target) ||
    PERCENT_VAR_RE.test(target) ||
    PLACEHOLDER_RE.test(target) ||
    target.startsWith('~')
  ) {
    return notEvaluable('variable-dependent');
  }
  if (SCHEME_RE.test(target) || target.startsWith('//')) return notEvaluable('external-resource');
  if (target.startsWith('\\\\')) return notEvaluable('inaccessible-local-target');

  target = target.replaceAll('\\', '/');
  if (DRIVE_RE.test(target)) return notEvaluable('inaccessible-local-target');
  if (target.startsWith('/')) {
    if (options.base !== 'root') return notEvaluable('inaccessible-local-target');
    target = target.replace(/^\/+/, '');
  }

  const directoryHint = target.endsWith('/') || /(^|\/)\.\.?$/.test(target);
  const stack =
    options.base === 'document' && options.sourceDir ? options.sourceDir.split('/').filter(Boolean) : [];
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (stack.length === 0) return notEvaluable('root-escape-attempt');
      stack.pop();
    } else {
      stack.push(segment);
    }
  }
  return { kind: 'path', path: stack.join('/').normalize('NFC'), directoryHint };
}
