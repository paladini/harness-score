import type { Report, ScanIncompleteReason, ScanVerdict } from './types.js';

/** Report snapshot whose completeness is being checked. */
export type VerdictScope = 'maturity' | 'effective';

const LEGACY_FILE_LIMIT: ScanIncompleteReason = { code: 'file-count-limit' };

/** Resolve additive verdicts while preserving fail-closed behavior for legacy reports. */
export function reportVerdict(report: Report, scope: VerdictScope): ScanVerdict {
  const explicit = report.verdicts?.[scope];
  if (explicit) return explicit;
  return report.truncated
    ? { status: 'incomplete', reasons: [LEGACY_FILE_LIMIT] }
    : { status: 'complete', reasons: [] };
}

/** Return whether the selected snapshot is authoritative. */
export function reportScopeIsComplete(report: Report, scope: VerdictScope): boolean {
  return reportVerdict(report, scope).status === 'complete';
}

/** Format an incomplete-scan reason for display. */
export function formatIncompleteReason(reason: ScanIncompleteReason): string {
  const location = reason.path ? ` at ${reason.path}` : '';
  const limit = reason.limit === undefined ? '' : ` (limit ${reason.limit})`;
  return `${reason.code}${location}${limit}`;
}
