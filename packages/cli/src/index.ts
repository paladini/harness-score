export { ALL_CHECKS } from './checks/index.js';
export type * from './config.js';
export {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  discoverConfig,
  loadConfigFile,
  parseConfigObject,
  parseScopeFlagList,
  resolveScanConfig,
} from './config.js';
export type * from './diff.js';
export { computeDiff } from './diff.js';
export type { ToolId } from './harness/registry.js';
export { TOOL_DISPLAY_NAMES, toolDisplayName } from './harness/registry.js';
export { renderBadge } from './report/badge.js';
export { renderMarkdown } from './report/markdown.js';
export { renderTerminal } from './report/terminal.js';
export type { CreateScanOptions, ScanOverlay } from './scan.js';
export { createScanContext } from './scan.js';
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

import { type CliConfigOverrides, resolveScanConfig } from './config.js';
import { buildReport } from './score.js';
import type { Report } from './types.js';

export interface ScoreOptions extends CliConfigOverrides {}

/** One-call API: scan a directory and get the full report. */
export function score(root: string, options: ScoreOptions = {}): Report {
  const rootAbs = root;
  const config = resolveScanConfig(rootAbs, options);
  return buildReport(rootAbs, config);
}
