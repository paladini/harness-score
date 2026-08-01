import { ALL_CHECKS } from './checks/index.js';
import type { ResolvedScanConfig, ResolvedSeverity } from './config.js';
import { resolveSeverities } from './config.js';
import { buildOverlays } from './harness/global-paths.js';
import { detectHarnesses } from './harness/index.js';
import { createScanContext } from './scan.js';
import type {
  CheckOutcome,
  CheckResult,
  DimensionId,
  DimensionScore,
  LevelInfo,
  Report,
  ScanContext,
  ScoreSnapshot,
} from './types.js';
import { DIMENSIONS } from './types.js';

export const DOCS_BASE_URL = 'https://paladini.github.io/harness-score/guide/measure-and-improve';
export const TOOL_VERSION = '1.5.2';

export const LEVEL_NAMES = ['Unharnessed', 'Documented', 'Guided', 'Sensing', 'Self-correcting'] as const;

function runChecks(ctx: ScanContext, severities: Map<string, ResolvedSeverity>): CheckResult[] {
  return ALL_CHECKS.map((check) => {
    let outcome: CheckOutcome;
    try {
      outcome = check.run(ctx);
    } catch (error) {
      outcome = { passed: false, evidence: `Check failed to execute: ${String(error)}` };
    }
    return {
      id: check.id,
      dimension: check.dimension,
      title: check.title,
      points: check.points,
      earned: outcome.passed ? check.points : 0,
      passed: outcome.passed,
      evidence: outcome.evidence,
      remediation: check.remediation,
      docsUrl: `${DOCS_BASE_URL}#${check.id.toLowerCase()}`,
      severity: severities.get(check.id)?.severity ?? 'error',
    };
  });
}

/** Checks with severity 'off' are excluded from both the numerator and denominator — structurally removed, never scored as failing. */
function scoreDimensions(checks: CheckResult[]): DimensionScore[] {
  return DIMENSIONS.map((dim) => {
    const own = checks.filter((c) => c.dimension === dim.id);
    const scored = own.filter((c) => c.severity !== 'off');
    const earned = scored.reduce((sum, c) => sum + c.earned, 0);
    const max = scored.reduce((sum, c) => sum + c.points, 0);
    return {
      id: dim.id,
      title: dim.title,
      earned,
      max,
      percent: max === 0 ? 0 : Math.round((earned / max) * 100),
      /** False only when every check originally in this dimension resolved to 'off'. */
      applicable: scored.length > 0,
    };
  });
}

interface Requirement {
  label: string;
  /** Set only by dimAtLeast — lets computeLevel tell "structurally unreachable" apart from "not yet met". */
  blockedDimension?: DimensionId;
  met(dims: Map<DimensionId, DimensionScore>, totalPercent: number): boolean;
}

const dimAtLeast = (id: DimensionId, pct: number): Requirement => ({
  label: `${id} ≥ ${pct}%`,
  blockedDimension: id,
  met: (dims) => {
    const dim = dims.get(id);
    if (!dim?.applicable) return false;
    return dim.percent >= pct;
  },
});

/**
 * The maturity ladder. A level is reached when ALL of its requirements
 * (and every previous level's) are met. Mirrored verbatim in the guide's
 * Maturity Model chapter — change both together.
 */
export const LEVEL_REQUIREMENTS: Requirement[][] = [
  /* L1 Documented */ [dimAtLeast('context', 40)],
  /* L2 Guided */ [
    dimAtLeast('context', 60),
    {
      label: 'skills ≥ 30% or hooks ≥ 30%',
      met: (dims) => (dims.get('skills')?.percent ?? 0) >= 30 || (dims.get('hooks')?.percent ?? 0) >= 30,
    },
    dimAtLeast('hygiene', 50),
  ],
  /* L3 Sensing */ [dimAtLeast('sensors', 60), dimAtLeast('ci', 50)],
  /* L4 Self-correcting */ [
    dimAtLeast('hooks', 70),
    { label: 'total ≥ 80%', met: (_dims, total) => total >= 80 },
  ],
];

function computeLevel(dimensions: DimensionScore[], totalPercent: number): LevelInfo {
  const dims = new Map<DimensionId, DimensionScore>(dimensions.map((d) => [d.id, d]));
  let index = 0;
  let gaps: string[] = [];
  let capped = false;
  let capReason: string | undefined;
  for (let level = 0; level < LEVEL_REQUIREMENTS.length; level += 1) {
    const unmet = LEVEL_REQUIREMENTS[level]!.filter((r) => !r.met(dims, totalPercent));
    if (unmet.length === 0) {
      index = level + 1;
    } else {
      gaps = unmet.map((r) => r.label);
      // At least one unmet requirement can never be satisfied (its dimension has zero
      // applicable checks under the current config) — the level itself is unreachable,
      // not just "not yet climbed," even if other unmet requirements are still actionable.
      const cappedReq = unmet.find(
        (r) => r.blockedDimension !== undefined && dims.get(r.blockedDimension)?.applicable === false,
      );
      if (cappedReq) {
        capped = true;
        capReason =
          `L${level + 1} requires ${cappedReq.label}, which is not reachable: the "${cappedReq.blockedDimension}" ` +
          'dimension has no applicable checks under the current config.';
      }
      break;
    }
  }
  return { index, name: LEVEL_NAMES[index]!, nextLevelGaps: gaps, capped, capReason };
}

function buildSnapshot(ctx: ScanContext, severities: Map<string, ResolvedSeverity>): ScoreSnapshot {
  const checks = runChecks(ctx, severities);
  const dimensions = scoreDimensions(checks);
  const scored = checks.filter((c) => c.severity !== 'off');
  const earned = scored.reduce((sum, c) => sum + c.earned, 0);
  const max = scored.reduce((sum, c) => sum + c.points, 0);
  const percent = max === 0 ? 0 : Math.round((earned / max) * 100);
  return {
    level: computeLevel(dimensions, percent),
    score: { earned, max, percent },
    dimensions,
    checks,
    detectedHarnesses: detectHarnesses(ctx),
  };
}

function snapshotsEqual(a: ScoreSnapshot, b: ScoreSnapshot): boolean {
  if (a.level.index !== b.level.index || a.score.percent !== b.score.percent) return false;
  if (a.checks.length !== b.checks.length) return false;
  for (let i = 0; i < a.checks.length; i += 1) {
    if (a.checks[i]!.passed !== b.checks[i]!.passed) return false;
  }
  return true;
}

export function buildReportFromContext(
  maturityCtx: ScanContext,
  effectiveCtx: ScanContext,
  config: ResolvedScanConfig,
  resolvedRoots: Report['resolvedRoots'],
): Report {
  const severities = resolveSeverities(config);
  const maturity = buildSnapshot(maturityCtx, severities);
  let effective = maturity;
  if (effectiveCtx !== maturityCtx) {
    const effSnapshot = buildSnapshot(effectiveCtx, severities);
    if (!snapshotsEqual(maturity, effSnapshot)) {
      effective = effSnapshot;
    }
  }

  const resolvedEntries = [...severities.entries()]
    .filter(([, v]) => v.source !== 'default')
    .map(([id, v]) => ({ id, severity: v.severity, source: v.source }));

  return {
    tool: { name: 'harness-score', version: TOOL_VERSION },
    root: maturityCtx.root,
    truncated: maturityCtx.truncated || effectiveCtx.truncated,
    scopes: { maturity: ['repo'], effective: config.effectiveScopes },
    gate: config.gate,
    resolvedRoots: resolvedRoots && resolvedRoots.length > 0 ? resolvedRoots : undefined,
    detectedHarnesses: maturity.detectedHarnesses,
    level: maturity.level,
    score: maturity.score,
    dimensions: maturity.dimensions,
    checks: maturity.checks,
    effective,
    preset: { extends: config.extends, rules: config.rules, resolved: resolvedEntries },
  };
}

/** Build a full report for a repository root with optional scope configuration. */
export function buildReport(rootInput: string, config?: ResolvedScanConfig): Report {
  const root = rootInput;
  const resolved = config ?? {
    scopes: { user: false, system: false },
    extraRoots: [],
    gate: 'maturity' as const,
    effectiveScopes: ['repo'] as const,
    extends: [],
    rules: {},
  };

  const maturityCtx = createScanContext(root);
  const hasExtraScopes = resolved.scopes.user || resolved.scopes.system || resolved.extraRoots.length > 0;

  if (!hasExtraScopes) {
    return buildReportFromContext(maturityCtx, maturityCtx, resolved, undefined);
  }

  const { overlays, resolvedRoots } = buildOverlays(root, resolved.scopes, resolved.extraRoots);
  const effectiveCtx = createScanContext(root, { overlays });
  return buildReportFromContext(maturityCtx, effectiveCtx, resolved, resolvedRoots);
}

/** @deprecated Prefer buildReport(root, config). Kept for internal use with a pre-built context. */
export function buildReportFromScanContext(ctx: ScanContext): Report {
  const defaultConfig: ResolvedScanConfig = {
    scopes: { user: false, system: false },
    extraRoots: [],
    gate: 'maturity',
    effectiveScopes: ['repo'],
    extends: [],
    rules: {},
  };
  return buildReportFromContext(ctx, ctx, defaultConfig, undefined);
}
