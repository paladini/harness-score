/**
 * Factual check of extracted references against the scanned repository.
 *
 * Every reference ends in exactly one of five states. A state decided during
 * extraction is kept as it is. The rest are looked up in the file index; a
 * positive lookup always counts, while a negative one is only a defect when the
 * scan could not have missed the target.
 */

import type { ScanContext } from '../types.js';
import { createAnchorVerifier } from './anchors.js';
import { filterGlob } from './glob.js';
import {
  type ExtractedReference,
  type ReferenceReason,
  type ReferenceRule,
  type ReferenceState,
  type ResolvedReference,
  RULES,
} from './types.js';

export type ResolveContext = Pick<
  ScanContext,
  'files' | 'has' | 'hasDirectory' | 'read' | 'matchingGlob' | 'incompleteReasons'
>;

interface FileIndex {
  fileExists(path: string): boolean;
  dirExists(path: string): boolean;
  glob(pattern: string): string[] | null;
  has(path: string): boolean;
  read(path: string): string | null;
  /** True when paths are compared after Unicode normalization. */
  normalized: boolean;
}

/**
 * Exact lookups when the context offers directory and glob lookups and every
 * scanned path is already NFC; otherwise a view built from `files`, so a
 * repository stored in decomposed form (common on macOS) or a context without
 * those lookups gives the same result everywhere.
 */
function createIndex(ctx: ResolveContext): FileIndex {
  const { hasDirectory, matchingGlob } = ctx;
  const composed = ctx.files.every((file) => file === file.normalize('NFC'));
  if (hasDirectory && matchingGlob && composed) {
    return {
      fileExists: (path) => ctx.has(path),
      dirExists: (path) => path === '' || hasDirectory.call(ctx, path),
      glob: (pattern) => matchingGlob.call(ctx, pattern),
      has: (path) => ctx.has(path),
      read: (path) => ctx.read(path),
      normalized: false,
    };
  }
  const real = new Map<string, string>();
  for (const file of ctx.files) real.set(file.normalize('NFC'), file);
  const files = [...real.keys()];
  const directories = new Set<string>();
  for (const file of files) {
    for (let slash = file.indexOf('/'); slash !== -1; slash = file.indexOf('/', slash + 1)) {
      directories.add(file.slice(0, slash));
    }
  }
  return {
    fileExists: (path) => real.has(path),
    dirExists: (path) => path === '' || directories.has(path),
    glob: (pattern) => filterGlob(pattern, files),
    has: (path) => real.has(path),
    read: (path) => ctx.read(real.get(path) ?? path),
    normalized: !composed,
  };
}

/** True when one path is the other, or an ancestor of it. */
function overlaps(a: string, b: string): boolean {
  if (a === '' || b === '') return true;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/** Leading segments of a glob that hold no wildcard. */
function literalPrefix(pattern: string): string {
  const kept: string[] = [];
  for (const segment of pattern.split('/')) {
    if (/[*?]/.test(segment)) break;
    kept.push(segment);
  }
  return kept.join('/');
}

/** Could the incomplete scan have missed something at or under `probe`? */
function scanMayHide(ctx: ResolveContext, probe: string): boolean {
  for (const reason of ctx.incompleteReasons ?? []) {
    if (!reason.path) return true;
    // A label prefix (`overlay:path`) is not a repository path: stay conservative.
    if (/^[^/]+:/.test(reason.path)) return true;
    if (overlaps(probe, reason.path)) return true;
  }
  return false;
}

/** A path in inline code or a code block, where the text does not show it is meant as a target. */
function inCode(ref: ExtractedReference): boolean {
  return ref.syntax === 'inline-code' || ref.syntax === 'code-block';
}

/** Why a path in code that was not found stays ambiguous instead of inconsistent. */
const CODE_CAVEAT = 'a path written in code may not be meant as a target';

function settle(
  ref: ExtractedReference,
  state: ReferenceState,
  rule: ReferenceRule,
  evidence: string,
  reasonCode: ReferenceReason | null = null,
): ResolvedReference {
  return { ...ref, state, rule, evidence, reasonCode };
}

/** Builds the resolver for one scan; the file index and anchor analysis are reused. */
export function createResolver(ctx: ResolveContext): (reference: ExtractedReference) => ResolvedReference {
  const index = createIndex(ctx);
  const verifyAnchor = createAnchorVerifier({ has: index.has, read: index.read });
  const note = index.normalized ? ' (matched after Unicode normalization)' : '';

  const incomplete = (ref: ExtractedReference, target: string): ResolvedReference =>
    settle(
      ref,
      'not-evaluable',
      RULES.scanIncomplete,
      `the scan was incomplete and may not include ${target || 'the repository root'}`,
      'incomplete-scan',
    );

  function checkPath(ref: ExtractedReference): ResolvedReference {
    const wantsDirectory = ref.form === 'directory-path';
    const kind = wantsDirectory ? 'directory' : 'file';
    const other = wantsDirectory ? 'file' : 'directory';
    const primary = ref.normalizedTarget ?? '';
    // Only paths written in code can be relative to the document; links and scope fields are not.
    const useAlternate = inCode(ref);
    const targets = [primary];
    if (useAlternate && ref.alternateTarget !== null) targets.push(ref.alternateTarget);

    const isExpected = (target: string) =>
      wantsDirectory ? index.dirExists(target) : index.fileExists(target);
    const isOther = (target: string) => (wantsDirectory ? index.fileExists(target) : index.dirExists(target));

    const found = targets.find(isExpected);
    if (found !== undefined) {
      const where = found === primary ? '' : ' relative to the document';
      const shown = found === '' ? 'the repository root' : found;
      const rule = wantsDirectory ? RULES.pathDirectoryFound : RULES.pathFileFound;
      return settle(ref, 'consistent', rule, `${kind} ${shown} exists${where}${note}`);
    }
    const wrongType = targets.find(isOther);
    if (wrongType !== undefined) {
      const mismatch = `${wrongType} exists but is a ${other}, not a ${kind}${note}`;
      if (useAlternate) {
        return settle(
          ref,
          'ambiguous',
          RULES.pathCodeTypeMismatch,
          `${mismatch}; ${CODE_CAVEAT}`,
          'operational-purpose-unknown',
        );
      }
      return settle(ref, 'inconsistent', RULES.pathTypeMismatch, mismatch, 'type-mismatch');
    }
    if (targets.some((target) => scanMayHide(ctx, target))) return incomplete(ref, primary);
    if (!ref.explicitPath && !wantsDirectory) {
      return settle(
        ref,
        'ambiguous',
        RULES.pathBareNameMissing,
        `"${ref.rawText}" was not found; a bare name may be a mention rather than a path`,
        'bare-name-not-found',
      );
    }
    if (useAlternate) {
      return settle(
        ref,
        'ambiguous',
        RULES.pathCodeMissing,
        `no ${kind} at ${targets.join(' or ')}; ${CODE_CAVEAT}`,
        'operational-purpose-unknown',
      );
    }
    return settle(
      ref,
      'inconsistent',
      wantsDirectory ? RULES.pathDirectoryMissing : RULES.pathFileMissing,
      `no ${kind} at ${targets.join(' or ')}`,
      'target-missing',
    );
  }

  function checkGlob(ref: ExtractedReference): ResolvedReference {
    const pattern = ref.normalizedTarget ?? '';
    const matches = index.glob(pattern);
    if (matches === null) {
      return settle(
        ref,
        'not-supported',
        RULES.globUnsupported,
        `glob ${pattern} is not supported`,
        'unsupported-glob',
      );
    }
    if (matches.length > 0) {
      return settle(
        ref,
        'consistent',
        RULES.globMatched,
        `${matches.length} matching file(s), e.g. ${matches[0]}${note}`,
      );
    }
    if (scanMayHide(ctx, literalPrefix(pattern))) return incomplete(ref, literalPrefix(pattern));
    return settle(
      ref,
      'inconsistent',
      RULES.globNoMatch,
      `no scanned file matches ${pattern}`,
      'glob-no-match',
    );
  }

  function checkAnchor(ref: ExtractedReference): ResolvedReference {
    const verdict = verifyAnchor(ref);
    if (verdict.reasonCode === 'document-missing' && scanMayHide(ctx, ref.normalizedTarget ?? '')) {
      return incomplete(ref, ref.normalizedTarget ?? '');
    }
    if (verdict.reasonCode === 'document-missing' && inCode(ref)) {
      return settle(
        ref,
        'ambiguous',
        RULES.anchorCodeDocumentMissing,
        `${verdict.evidence}; ${CODE_CAVEAT}`,
        'operational-purpose-unknown',
      );
    }
    return settle(ref, verdict.state, verdict.rule, verdict.evidence, verdict.reasonCode);
  }

  /** A state decided at extraction stays; a path-like ambiguity gets the index evidence. */
  function passThrough(ref: ExtractedReference, state: ReferenceState): ResolvedReference {
    let evidence = ref.evidence;
    if (state === 'ambiguous' && ref.reasonCode === 'no-type-indicator' && ref.normalizedTarget !== null) {
      if (index.dirExists(ref.normalizedTarget) && ref.normalizedTarget !== '') {
        evidence += `; the path exists as a directory${note}`;
      } else if (index.fileExists(ref.normalizedTarget)) {
        evidence += `; the path exists as a file${note}`;
      }
    }
    return { ...ref, state, evidence };
  }

  return (ref) => {
    if (ref.state !== 'pending') return passThrough(ref, ref.state);
    switch (ref.form) {
      case 'file-path':
      case 'directory-path':
        return checkPath(ref);
      case 'glob-pattern':
        return checkGlob(ref);
      case 'anchor-same-doc':
      case 'anchor-other-doc':
        return checkAnchor(ref);
      default:
        return settle(
          ref,
          'not-supported',
          RULES.referenceUnsupportedType,
          'reference type is not supported',
        );
    }
  };
}
