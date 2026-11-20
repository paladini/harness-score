/**
 * Facade over the reference check: discover the operational documents of a
 * scanned repository, extract their references and resolve each one.
 *
 * Only documents with an `operational` scope are checked. Documents under
 * example, tutorial, fixture or demo directories and archived spec changes are
 * listed in `skipped` and left unchecked.
 */

import type { ScanContext } from '../types.js';
import { findOperationalDocuments, type OperationalDocument } from './documents.js';
import { extractReferences } from './extract.js';
import { createResolver } from './resolve.js';
import type { ReferenceState, ResolvedReference } from './types.js';

export interface AnalysisResult {
  /** Every recognized document, in path order. */
  documents: OperationalDocument[];
  /** One entry per reference occurrence, by document path and then position. */
  references: ResolvedReference[];
  /** Recognized documents that were not checked (illustrative or archived). */
  skipped: OperationalDocument[];
  /** Operational documents that could not be read. */
  unreadable: string[];
  /** False when the repository scan was incomplete. */
  scanComplete: boolean;
}

export function analyzeRepository(ctx: ScanContext): AnalysisResult {
  const documents = findOperationalDocuments(ctx);
  const resolve = createResolver(ctx);
  const references: ResolvedReference[] = [];
  const skipped: OperationalDocument[] = [];
  const unreadable: string[] = [];

  for (const document of documents) {
    if (document.scope !== 'operational') {
      skipped.push(document);
      continue;
    }
    const content = ctx.read(document.path);
    if (content === null) {
      unreadable.push(document.path);
      continue;
    }
    const { references: extracted } = extractReferences({
      path: document.path,
      kind: document.kind,
      content,
    });
    for (const reference of extracted) references.push(resolve(reference));
  }

  return { documents, references, skipped, unreadable, scanComplete: !ctx.truncated };
}

/** Occurrences per state, always listing all five. */
export function countByState(references: readonly ResolvedReference[]): Record<ReferenceState, number> {
  const counts: Record<ReferenceState, number> = {
    consistent: 0,
    inconsistent: 0,
    'not-evaluable': 0,
    'not-supported': 0,
    ambiguous: 0,
  };
  for (const reference of references) counts[reference.state]++;
  return counts;
}
