export { ALL_CHECKS } from './checks/index.js';
export type * from './config.js';
export {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  discoverConfig,
  loadConfigFile,
  PRESET_REGISTRY,
  parseConfigObject,
  parseScopeFlagList,
  resolveScanConfig,
  resolveSeverities,
} from './config.js';
export type * from './diff.js';
export { computeDiff } from './diff.js';
export type { ToolId } from './harness/registry.js';
export { TOOL_DISPLAY_NAMES, toolDisplayName } from './harness/registry.js';
export type { SourcePosition } from './references/markdown.js';
export type {
  ReferenceForm,
  ReferenceReason,
  ReferenceRule,
  ReferenceState,
  ReferenceSyntax,
  ResolvedReference,
  SourceArtifactKind,
} from './references/types.js';
export { RULES } from './references/types.js';
export { renderBadge } from './report/badge.js';
export { renderMarkdown } from './report/markdown.js';
export { renderTerminal } from './report/terminal.js';
export type { CreateScanOptions, ScanOverlay } from './scan.js';
export { createScanContext } from './scan.js';
export type { ReportOptions } from './score.js';
export {
  buildReport,
  buildReportFromContext,
  buildReportFromScanContext,
  DOCS_BASE_URL,
  LEVEL_NAMES,
  LEVEL_REQUIREMENTS,
  TOOL_VERSION,
} from './score.js';
export type * from './types.js';
export type { VerdictScope } from './verdict.js';
export { formatIncompleteReason, reportScopeIsComplete, reportVerdict } from './verdict.js';

import { type CliConfigOverrides, resolveScanConfig } from './config.js';
import { buildReport } from './score.js';
import type { Report } from './types.js';

/** Options for resolving configuration before scanning a repository. */
export interface ScoreOptions extends CliConfigOverrides {
  /** Also check the references in operational documents (informational, never scored). */
  references?: boolean;
}

/** One-call API: scan a directory and get the full report. */
export function score(root: string, options: ScoreOptions = {}): Report {
  const rootAbs = root;
  const config = resolveScanConfig(rootAbs, options);
  return buildReport(rootAbs, config, { references: options.references });
}
