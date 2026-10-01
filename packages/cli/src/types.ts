export type DimensionId = 'context' | 'skills' | 'hooks' | 'sensors' | 'ci' | 'hygiene';

export interface DimensionInfo {
  id: DimensionId;
  title: string;
}

export const DIMENSIONS: DimensionInfo[] = [
  { id: 'context', title: 'Context & Guides' },
  { id: 'skills', title: 'Skills & Commands' },
  { id: 'hooks', title: 'Hooks & Guardrails' },
  { id: 'sensors', title: 'Sensors & Feedback' },
  { id: 'ci', title: 'CI Feedback' },
  { id: 'hygiene', title: 'Hygiene & Safety' },
];

/** Everything a check may look at. Built once per scan; checks never touch the filesystem directly. */
export interface ScanContext {
  /** Absolute path of the scanned repository root. */
  root: string;
  /** All file paths relative to root, POSIX separators, sorted. */
  files: string[];
  /** Compatibility alias: true whenever the scan is incomplete for any reason. */
  truncated: boolean;
  /** Deterministic reasons the filesystem walk or a requested file read could not complete. */
  incompleteReasons?: ScanIncompleteReason[];
  /** True when the relative path exists as a file. */
  has(relPath: string): boolean;
  /** File content as UTF-8, or null when missing/unreadable/over the read limit. Cached. */
  read(relPath: string): string | null;
  /** All files whose relative path matches the regex. */
  matching(re: RegExp): string[];
}

/** Non-fatal diagnostic attached to a check result. */
export interface ScanDiagnostic {
  code: string;
  message: string;
  source?: string;
}

export type ScanIncompleteReasonCode =
  | 'file-count-limit'
  | 'depth-limit'
  | 'unreadable-directory'
  | 'unreadable-path'
  | 'outside-root-symlink';

export interface ScanIncompleteReason {
  code: ScanIncompleteReasonCode;
  path?: string;
  limit?: number;
}

export type ScanVerdictStatus = 'complete' | 'incomplete';

export interface ScanVerdict {
  status: ScanVerdictStatus;
  reasons: ScanIncompleteReason[];
}

export interface CheckOutcome {
  passed: boolean;
  /** Human-readable proof: what was found (or not found) and where. */
  evidence: string;
  /**
   * When false, the check does not apply to this repository and is excluded
   * from both the numerator and the denominator. Defaults to true.
   */
  applicable?: boolean;
  /** Forward-compatible or secondary findings that do not change points. */
  warnings?: ScanDiagnostic[];
}

export interface Check {
  /** Stable id like "CTX-01"; doubles as the docs anchor (lowercased). */
  id: string;
  dimension: DimensionId;
  title: string;
  points: number;
  /** One actionable sentence shown when the check fails. */
  remediation: string;
  run(ctx: ScanContext): CheckOutcome;
}

export interface CheckResult {
  id: string;
  dimension: DimensionId;
  title: string;
  points: number;
  earned: number;
  passed: boolean;
  evidence: string;
  remediation: string;
  docsUrl: string;
  /** Resolved severity ('off' checks are excluded from scoring but still listed here). */
  severity: Severity;
  /**
   * False when the check does not apply to this repository. Excluded from
   * scoring, distinct from severity 'off' (which is config). Older reports
   * omit this field; treat a missing value as true.
   */
  applicable: boolean;
  /** Non-fatal diagnostics emitted while evaluating this check. */
  warnings?: ScanDiagnostic[];
}

export interface DimensionScore {
  id: DimensionId;
  title: string;
  earned: number;
  max: number;
  /** 0–100, rounded. */
  percent: number;
  /** False when no check in this dimension is scored ('off' and/or not applicable). */
  applicable: boolean;
}

export interface LevelInfo {
  /** 0–4 */
  index: number;
  name: string;
  /** What is missing to reach the next level; empty at L4. */
  nextLevelGaps: string[];
  /** True when at least one blocking requirement for the next level can never be met under the current config (e.g. its dimension was excluded by a preset). */
  capped: boolean;
  /** Human-readable explanation of why the level is capped; set only when `capped` is true. */
  capReason?: string;
}

/** One scored snapshot (maturity or effective). */
export interface ScoreSnapshot {
  level: LevelInfo;
  score: { earned: number; max: number; percent: number };
  dimensions: DimensionScore[];
  checks: CheckResult[];
  detectedHarnesses: string[];
}

import type { GateMode, Severity } from './config.js';

/** Local team customization actually applied to this scan, always present and never hidden behind a flag. */
export interface PresetInfo {
  /** Preset names from `.harness-score.json`'s `extends`, in application order. */
  extends: string[];
  /** Raw per-check severity overrides from `.harness-score.json`'s `rules`. */
  rules: Record<string, Severity>;
  /** Every check whose resolved severity differs from the 'default' error baseline, with why. */
  resolved: Array<{ id: string; severity: Severity; source: string }>;
}

export interface Report {
  tool: { name: string; version: string };
  root: string;
  /** Compatibility alias: true whenever the maturity or effective snapshot is incomplete. */
  truncated: boolean;
  /** Authoritative completeness for repository-only and effective snapshots. */
  verdicts?: { maturity: ScanVerdict; effective: ScanVerdict };
  /** Scopes included in each score. */
  scopes: { maturity: ['repo']; effective: Array<'repo' | 'user' | 'system' | string> };
  /** Which score `--min-level` and CI gates use. */
  gate: GateMode;
  /** Absolute paths resolved for non-repo scopes (informational). */
  resolvedRoots?: Array<{ scope: string; absPath: string }>;
  /** Tool IDs with at least one harness artifact detected in the repo (informational). */
  detectedHarnesses: string[];
  /** Repository-only score — canonical for CI when gate is maturity. */
  level: LevelInfo;
  score: { earned: number; max: number; percent: number };
  dimensions: DimensionScore[];
  checks: CheckResult[];
  /** Repo ∪ configured global/extra scopes — what the agent likely sees on this machine. */
  effective: ScoreSnapshot;
  /** Team customization (extends/rules) actually applied to this scan. */
  preset: PresetInfo;
}
