import type { DimensionId, Report } from './types.js';

export interface DimensionDelta {
  id: DimensionId;
  title: string;
  before: number;
  after: number;
  delta: number;
}

export interface CheckDelta {
  id: string;
  title: string;
  points: number;
  change: 'newly-passing' | 'newly-failing';
}

export interface ReportDiff {
  level: { before: number; beforeName: string; after: number; afterName: string; delta: number };
  score: {
    before: { earned: number; max: number; percent: number };
    after: { earned: number; max: number; percent: number };
    /** Raw point delta. Only meaningful when `before.max === after.max` — prefer deltaPercent otherwise. */
    deltaEarned: number;
    deltaPercent: number;
  };
  dimensions: DimensionDelta[];
  checksChanged: CheckDelta[];
  /**
   * True when baseline and current come from different tool versions (or
   * the maturity model's point total changed) — dimension/score deltas may then
   * reflect a maturity model change rather than an actual change in the repository.
   */
  maturityModelChanged: boolean;
}

/**
 * Compares two reports from the same maturity model version. Checks present in
 * `current` but absent from `baseline` (e.g. the model gained a check between
 * scans) are ignored for the pass/fail delta — that's a maturity model change, not a
 * regression or improvement in the scanned repository.
 */
export function computeDiff(baseline: Report, current: Report): ReportDiff {
  const baselineChecks = new Map(baseline.checks.map((c) => [c.id, c]));
  const checksChanged: CheckDelta[] = [];
  for (const check of current.checks) {
    const before = baselineChecks.get(check.id);
    if (!before || before.passed === check.passed) continue;
    checksChanged.push({
      id: check.id,
      title: check.title,
      points: check.points,
      change: check.passed ? 'newly-passing' : 'newly-failing',
    });
  }

  const baselineDims = new Map(baseline.dimensions.map((d) => [d.id, d]));
  const dimensions: DimensionDelta[] = current.dimensions.map((d) => {
    const beforePercent = baselineDims.get(d.id)?.percent ?? 0;
    return {
      id: d.id,
      title: d.title,
      before: beforePercent,
      after: d.percent,
      delta: d.percent - beforePercent,
    };
  });

  return {
    level: {
      before: baseline.level.index,
      beforeName: baseline.level.name,
      after: current.level.index,
      afterName: current.level.name,
      delta: current.level.index - baseline.level.index,
    },
    score: {
      before: { ...baseline.score },
      after: { ...current.score },
      deltaEarned: current.score.earned - baseline.score.earned,
      deltaPercent: current.score.percent - baseline.score.percent,
    },
    dimensions,
    checksChanged,
    maturityModelChanged:
      baseline.tool.version !== current.tool.version || baseline.score.max !== current.score.max,
  };
}
