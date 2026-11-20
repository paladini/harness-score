/**
 * Markdown anchors: how a heading becomes an anchor name, which anchors a
 * document defines, and whether an anchor reference resolves.
 *
 * Convention (the one the reference check applies, stated here on purpose):
 * the anchor of a heading is its visible text, lowercased and NFC-normalized,
 * with spaces turned into `-` and everything that is not a letter, mark, number,
 * `-` or `_` removed. A repeated heading gets `-1`, `-2`, ... in order. When a
 * reference and a heading differ only by accents, the reference still resolves
 * and the verdict says it matched after removing accents.
 *
 * Known limits: HTML entities in headings and the slug variants of other
 * platforms are not handled.
 */

import type { ScanContext } from '../types.js';
import { scanMarkdown } from './markdown.js';
import { type ExtractedReference, type ReferenceReason, type ReferenceRule, RULES } from './types.js';

/** Decode percent escapes, compose accents (NFC) and lowercase a link fragment. */
export function normalizeFragment(raw: string): string {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // Malformed escape: keep the fragment as written.
  }
  return value.normalize('NFC').toLowerCase();
}

/** Remove accents so spellings that differ only by diacritics compare equal. */
export function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/** The visible text of a heading: inline Markdown reduced to its words. */
export function headingPlainText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*~]+/g, '')
    .replace(/(^|[^\p{L}\p{N}])_+([^_]+?)_+(?![\p{L}\p{N}])/gu, '$1$2')
    .trim();
}

/** The anchor name a single heading produces, before the repeated-heading rule. */
export function slugifyHeading(raw: string): string {
  const text = headingPlainText(raw).normalize('NFC').toLowerCase();
  let slug = '';
  for (const ch of text) {
    if (/[\p{L}\p{M}\p{N}_-]/u.test(ch)) slug += ch;
    else if (/\s/u.test(ch)) slug += '-';
  }
  return slug;
}

/** Anchor names for headings in document order; repeats get `-1`, `-2`, ... */
export function assignAnchorNames(headings: readonly string[]): string[] {
  const occurrences = new Map<string, number>();
  const names: string[] = [];
  for (const heading of headings) {
    const base = slugifyHeading(heading);
    if (base === '') continue;
    let name = base;
    while (occurrences.has(name)) {
      const next = (occurrences.get(base) ?? 0) + 1;
      occurrences.set(base, next);
      name = `${base}-${next}`;
    }
    occurrences.set(name, 0);
    names.push(name);
  }
  return names;
}

export interface DocumentAnchors {
  /** Anchor names produced by headings. */
  headings: ReadonlySet<string>;
  /** The same names without accents. */
  foldedHeadings: ReadonlySet<string>;
  /** Names declared by `<a name>` / `<a id>`, lowercased and without accents. */
  htmlNames: ReadonlySet<string>;
}

export function documentAnchors(content: string): DocumentAnchors {
  const nodes = scanMarkdown(content);
  const titles: string[] = [];
  const htmlNames = new Set<string>();
  for (const node of nodes) {
    if (node.type === 'heading') titles.push(node.text.text);
    else if (node.type === 'html-anchor') htmlNames.add(foldAccents(normalizeFragment(node.value.text)));
  }
  const names = assignAnchorNames(titles);
  return {
    headings: new Set(names),
    foldedHeadings: new Set(names.map(foldAccents)),
    htmlNames,
  };
}

export interface AnchorVerdict {
  state: 'consistent' | 'inconsistent' | 'not-supported' | 'not-evaluable';
  reasonCode: ReferenceReason | null;
  rule: ReferenceRule;
  evidence: string;
}

const MARKDOWN_FILE_RE = /\.(md|markdown|mdx|mdc)$/i;

/**
 * Builds a verifier for anchor references (same document and other document).
 * It reads documents through `ctx` and keeps the analysis of each one.
 */
export function createAnchorVerifier(
  ctx: Pick<ScanContext, 'has' | 'read'>,
): (reference: ExtractedReference) => AnchorVerdict {
  const cache = new Map<string, DocumentAnchors | null>();
  const anchorsOf = (path: string): DocumentAnchors | null => {
    if (!cache.has(path)) {
      const content = ctx.read(path);
      cache.set(path, content === null ? null : documentAnchors(content));
    }
    return cache.get(path) ?? null;
  };

  return (reference) => {
    if (reference.form !== 'anchor-same-doc' && reference.form !== 'anchor-other-doc') {
      throw new TypeError(`not an anchor reference: ${reference.form}`);
    }
    const slug = reference.anchor ?? '';
    const path =
      reference.form === 'anchor-same-doc' ? reference.sourceArtifact : (reference.normalizedTarget ?? '');

    if (reference.form === 'anchor-other-doc') {
      if (!ctx.has(path)) {
        return {
          state: 'inconsistent',
          reasonCode: 'document-missing',
          rule: RULES.anchorDocumentMissing,
          evidence: `document ${path} does not exist`,
        };
      }
      if (!MARKDOWN_FILE_RE.test(path)) {
        return {
          state: 'not-supported',
          reasonCode: 'non-markdown-anchor',
          rule: RULES.anchorNonMarkdown,
          evidence: `${path} is not a Markdown document, so its anchors are not resolved`,
        };
      }
    }

    const anchors = anchorsOf(path);
    if (!anchors) {
      return {
        state: 'not-evaluable',
        reasonCode: 'inaccessible-local-target',
        rule: RULES.anchorUnreadable,
        evidence: `${path} could not be read`,
      };
    }
    if (anchors.headings.has(slug)) {
      return {
        state: 'consistent',
        reasonCode: null,
        rule: RULES.anchorFound,
        evidence: `heading anchor "${slug}" found in ${path}`,
      };
    }
    const folded = foldAccents(slug);
    if (anchors.foldedHeadings.has(folded)) {
      return {
        state: 'consistent',
        reasonCode: null,
        rule: RULES.anchorFound,
        evidence: `heading anchor "${slug}" found in ${path} after removing accents`,
      };
    }
    if (anchors.htmlNames.has(folded)) {
      return {
        state: 'not-supported',
        reasonCode: 'html-anchor',
        rule: RULES.anchorHtml,
        evidence: `"${slug}" is declared by an HTML anchor in ${path}, which is not resolved`,
      };
    }
    return {
      state: 'inconsistent',
      reasonCode: 'anchor-missing',
      rule: RULES.anchorMissing,
      evidence: `no heading anchor "${slug}" in ${path}`,
    };
  };
}
