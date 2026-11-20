/**
 * Builds the `references` section of a report from a scan context. This is the
 * only place the reference check meets the report: nothing here feeds the score.
 */

import type { ReferenceReport, ScanContext } from '../types.js';
import { analyzeRepository, countByState } from './analyze.js';
import { assessSpecifications } from './specs.js';

export function buildReferenceReport(ctx: ScanContext): ReferenceReport {
  const analysis = analyzeRepository(ctx);

  const reasons = new Map<string, number>();
  for (const occurrence of analysis.references) {
    if (occurrence.reasonCode !== null) {
      reasons.set(occurrence.reasonCode, (reasons.get(occurrence.reasonCode) ?? 0) + 1);
    }
  }
  const byReason: Record<string, number> = {};
  for (const reason of [...reasons.keys()].sort()) byReason[reason] = reasons.get(reason)!;

  return {
    summary: {
      operationalDocuments: analysis.documents.length - analysis.skipped.length - analysis.unreadable.length,
      skippedDocuments: analysis.skipped.length,
      unreadableDocuments: analysis.unreadable.length,
      occurrences: analysis.references.length,
      byState: countByState(analysis.references),
      byReason,
      scanComplete: analysis.scanComplete,
    },
    occurrences: analysis.references,
    skipped: analysis.skipped.map((document) => ({
      path: document.path,
      kind: document.kind,
      scope: document.scope as 'illustrative' | 'archived',
    })),
    unreadable: analysis.unreadable,
    specifications: assessSpecifications(ctx, analysis),
  };
}
