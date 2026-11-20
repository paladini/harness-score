import type { ReferenceState, ResolvedReference, SourceArtifactKind } from './references/types.js';

/** Stable identifiers for the six dimensions of the maturity model. */
export type DimensionId = 'context' | 'skills' | 'hooks' | 'sensors' | 'ci' | 'hygiene';

/** Display metadata for a maturity dimension. */
export interface DimensionInfo {
  id: DimensionId;
  title: string;
}

/** Display metadata for the maturity dimensions in report order. */
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
  /** Paths supplied by user/system/extra-root overlays rather than the repository tree. */
  overlayFiles?: ReadonlySet<string>;
  /** Compatibility alias: true whenever the scan is incomplete for any reason. */
  truncated: boolean;
  /** Deterministic reasons the filesystem walk or a requested file read could not complete. */
  incompleteReasons?: ScanIncompleteReason[];
  /** True when the relative path exists as a file. */
  has(relPath: string): boolean;
  /** True when at least one scanned file lives under the relative directory path. Empty directories are not detected. Optional for custom contexts; derived from `files` when absent. */
  hasDirectory?(relPath: string): boolean;
  /** File content as UTF-8, or null when missing/unreadable/over the read limit. Cached. */
  read(relPath: string): string | null;
  /** All files whose relative path matches the regex. */
  matching(re: RegExp): string[];
  /** Files matching a glob pattern, or null when the pattern uses unsupported syntax. Optional for custom contexts; derived from `files` when absent. */
  matchingGlob?(pattern: string): string[] | null;
}

/** Non-fatal diagnostic attached to a check result. */
export interface ScanDiagnostic {
  code: string;
  message: string;
  source?: string;
}

/** Machine-readable reason why a scan could not be completed. */
export type ScanIncompleteReasonCode =
  | 'file-count-limit'
  | 'depth-limit'
  | 'unreadable-directory'
  | 'unreadable-path'
  | 'outside-root-symlink';

/** Details of an incomplete filesystem scan. */
export interface ScanIncompleteReason {
  code: ScanIncompleteReasonCode;
  path?: string;
  limit?: number;
}

/** Whether a snapshot can be treated as authoritative. */
export type ScanVerdictStatus = 'complete' | 'incomplete';

/** Completeness of a snapshot and the reasons for any incomplete scan. */
export interface ScanVerdict {
  status: ScanVerdictStatus;
  reasons: ScanIncompleteReason[];
}

/** Result returned by a check before scoring and configuration are applied. */
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

/** Definition of a synchronous, deterministic maturity check. */
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

/** Scored result and evidence for one check. */
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

/** Points and applicability for a single maturity dimension. */
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

/** Attained maturity level and any gaps to the next level. */
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

/** Complete scan report, including repository and effective snapshots. */
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
  /** Extra repo-relative paths made visible inside normally skipped directories. */
  scan?: { includePaths: string[] };
  /**
   * Reference check of the operational documents. Present only when requested
   * (`--references`); informational, never part of the score, level or exit code.
   */
  references?: ReferenceReport;
}

/** Outcome of checking the references written in a repository's operational documents. */
export interface ReferenceReport {
  summary: {
    /** Operational documents whose references were checked. */
    operationalDocuments: number;
    /** Recognized documents left unchecked (illustrative or archived). */
    skippedDocuments: number;
    /** Operational documents that could not be read. */
    unreadableDocuments: number;
    occurrences: number;
    byState: Record<ReferenceState, number>;
    /** Occurrences per reason code, for every state that carries one. */
    byReason: Record<string, number>;
    /** False when the repository scan was incomplete. */
    scanComplete: boolean;
  };
  /** Every reference occurrence, by document path and then position. */
  occurrences: ResolvedReference[];
  skipped: Array<{ path: string; kind: SourceArtifactKind; scope: 'illustrative' | 'archived' }>;
  unreadable: string[];
  /** Structural recognition of versioned specifications (OpenSpec). */
  specifications: SpecificationReport;
}

/** Whether a specification document has the minimum content of a proposal, requirement, spec or task. */
export type SpecificationContent = 'sufficient' | 'empty' | 'insufficient' | 'unreadable' | 'not-assessed';

export type SpecificationStructureStatus = 'identified' | 'not-identified' | 'external';

/**
 * Three independent properties of a repository's versioned specifications:
 * an identifiable structure, minimum content, and consistent internal
 * references. There is no combined verdict and no score.
 */
export interface SpecificationReport {
  structure: {
    status: SpecificationStructureStatus;
    convention: 'openspec' | null;
    /** Spec documents, active change folders and archived change folders. */
    parts: { specs: number; activeChanges: number; archivedChanges: number };
  };
  documents: Array<{
    path: string;
    scope: 'operational' | 'illustrative' | 'archived';
    minimumContent: SpecificationContent;
    references: { total: number; byState: Record<ReferenceState, number> };
  }>;
  properties: {
    structure: SpecificationStructureStatus;
    /** Counts over operational specification documents only. */
    minimumContent: { sufficient: number; empty: number; insufficient: number; unreadable: number };
    /** States of the references found in operational specification documents. */
    referenceConsistency: Record<ReferenceState, number>;
  };
}
