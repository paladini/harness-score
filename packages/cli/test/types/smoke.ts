/**
 * Type-only packaging smoke test: imports every symbol the package.json
 * "exports"/"types" map claims to publish, resolved against the *built*
 * dist/ output (not src/) — exercised with its own tsconfig via
 * `npm run typecheck:consumer`, never executed. This is the check that
 * catches a wrong "types" path or a missing re-export; vitest's runtime
 * tests import from src/ and would never see a packaging regression.
 */
import {
  ALL_CHECKS,
  buildReport,
  type Check,
  type CheckDelta,
  type CheckOutcome,
  type CheckResult,
  computeDiff,
  createScanContext,
  type DimensionDelta,
  type DimensionId,
  type DimensionInfo,
  type DimensionScore,
  DOCS_BASE_URL,
  formatIncompleteReason,
  LEVEL_NAMES,
  LEVEL_REQUIREMENTS,
  type LevelInfo,
  PRESET_REGISTRY,
  type ReferenceReport,
  type ReferenceState,
  type Report,
  type ReportDiff,
  type ResolvedReference,
  renderBadge,
  renderMarkdown,
  renderTerminal,
  reportScopeIsComplete,
  reportVerdict,
  resolveSeverities,
  type ScanContext,
  type ScanDiagnostic,
  type ScanIncompleteReason,
  type ScanVerdict,
  type ScanVerdictStatus,
  type Severity,
  score,
  TOOL_DISPLAY_NAMES,
  TOOL_VERSION,
  type ToolId,
  toolDisplayName,
} from '../../dist/index.js';

const checks: Check[] = ALL_CHECKS;
const ctx: ScanContext = createScanContext('.');
const built: Report = buildReport('.');
const scored: Report = score('.');
const diff: ReportDiff = computeDiff(built, scored);
const badge: string = renderBadge(scored);
const markdown: string = renderMarkdown(scored);
const terminal: string = renderTerminal(scored);

const dimensionInfo: DimensionInfo[] = [];
const dimensionId: DimensionId = 'context';
const dimensionScore: DimensionScore = scored.dimensions[0]!;
const levelInfo: LevelInfo = scored.level;
const checkOutcome: CheckOutcome = { passed: true, evidence: 'x' };
const checkResult: CheckResult = scored.checks[0]!;
const diagnostic: ScanDiagnostic = { code: 'future-event', message: 'x', source: '.claude/settings.json' };
const incompleteReason: ScanIncompleteReason = { code: 'depth-limit', path: 'deep', limit: 10 };
const unreadablePathReason: ScanIncompleteReason = { code: 'unreadable-path', path: 'AGENTS.md' };
const outsideRootSymlinkReason: ScanIncompleteReason = {
  code: 'outside-root-symlink',
  path: 'shared/AGENTS.md',
};
const verdict: ScanVerdict = reportVerdict(scored, 'maturity');
const verdictStatus: ScanVerdictStatus = verdict.status;
const complete: boolean = reportScopeIsComplete(scored, 'maturity');
const formattedReason: string = formatIncompleteReason(incompleteReason);
const checkDelta: CheckDelta | undefined = diff.checksChanged[0];
const dimensionDelta: DimensionDelta = diff.dimensions[0]!;
const toolId: ToolId = 'devin';
const toolName: string = toolDisplayName(toolId);
const devinDisplayName: string = TOOL_DISPLAY_NAMES.devin;
const severity: Severity = scored.checks[0]!.severity;
const severities = resolveSeverities({ extends: [], rules: {} });
const presets = PRESET_REGISTRY;
// The reference check is opt-in and optional: absent unless requested.
const withReferences: Report = score('.', { references: true });
const referenceReport: ReferenceReport | undefined = withReferences.references;
const referenceState: ReferenceState = 'not-evaluable';
const occurrence: ResolvedReference | undefined = referenceReport?.occurrences[0];
const noReferences: ReferenceReport | undefined = scored.references;

// Referenced only so the compiler treats every import as used; this file is
// never executed, only type-checked.
void [
  checks,
  ctx,
  built,
  scored,
  diff,
  badge,
  markdown,
  terminal,
  dimensionInfo,
  dimensionId,
  dimensionScore,
  levelInfo,
  checkOutcome,
  checkResult,
  diagnostic,
  incompleteReason,
  unreadablePathReason,
  outsideRootSymlinkReason,
  verdict,
  verdictStatus,
  complete,
  formattedReason,
  checkDelta,
  dimensionDelta,
  toolId,
  toolName,
  devinDisplayName,
  severity,
  severities,
  presets,
  withReferences,
  referenceReport,
  referenceState,
  occurrence,
  noReferences,
  DOCS_BASE_URL,
  LEVEL_NAMES,
  LEVEL_REQUIREMENTS,
  TOOL_DISPLAY_NAMES,
  TOOL_VERSION,
];
