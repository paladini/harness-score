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
  LEVEL_NAMES,
  LEVEL_REQUIREMENTS,
  type LevelInfo,
  type Report,
  type ReportDiff,
  renderBadge,
  renderMarkdown,
  renderTerminal,
  type ScanContext,
  score,
  TOOL_VERSION,
} from '../../dist/index.js';

const checks: Check[] = ALL_CHECKS;
const ctx: ScanContext = createScanContext('.');
const built: Report = buildReport(ctx);
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
const checkDelta: CheckDelta | undefined = diff.checksChanged[0];
const dimensionDelta: DimensionDelta = diff.dimensions[0]!;

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
  checkDelta,
  dimensionDelta,
  DOCS_BASE_URL,
  LEVEL_NAMES,
  LEVEL_REQUIREMENTS,
  TOOL_VERSION,
];
