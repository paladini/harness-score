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
  /** True if the scan hit MAX_FILES and stopped before the tree was fully walked. */
  truncated: boolean;
  /** True when the relative path exists as a file. */
  has(relPath: string): boolean;
  /** File content as UTF-8, or null when missing/unreadable. Cached. */
  read(relPath: string): string | null;
  /** All files whose relative path matches the regex. */
  matching(re: RegExp): string[];
}

export interface CheckOutcome {
  passed: boolean;
  /** Human-readable proof: what was found (or not found) and where. */
  evidence: string;
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
}

export interface DimensionScore {
  id: DimensionId;
  title: string;
  earned: number;
  max: number;
  /** 0–100, rounded. */
  percent: number;
}

export interface LevelInfo {
  /** 0–4 */
  index: number;
  name: string;
  /** What is missing to reach the next level; empty at L4. */
  nextLevelGaps: string[];
}

/** One scored snapshot (maturity or effective). */
export interface ScoreSnapshot {
  level: LevelInfo;
  score: { earned: number; max: number; percent: number };
  dimensions: DimensionScore[];
  checks: CheckResult[];
  detectedHarnesses: string[];
}

import type { GateMode } from './config.js';

export interface Report {
  tool: { name: string; version: string };
  root: string;
  /** True if the scan hit its file-count cap before fully walking the tree — results may be incomplete. */
  truncated: boolean;
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
}
