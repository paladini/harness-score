export { ALL_CHECKS } from './checks/index.js';
export type * from './diff.js';
export { computeDiff } from './diff.js';
export type { ToolId } from './harness/registry.js';
export { TOOL_DISPLAY_NAMES, toolDisplayName } from './harness/registry.js';
export { renderBadge } from './report/badge.js';
export { renderMarkdown } from './report/markdown.js';
export { renderTerminal } from './report/terminal.js';
export { createScanContext } from './scan.js';
export { buildReport, DOCS_BASE_URL, LEVEL_NAMES, LEVEL_REQUIREMENTS, TOOL_VERSION } from './score.js';
export type * from './types.js';

import { createScanContext } from './scan.js';
import { buildReport } from './score.js';
import type { Report } from './types.js';

/** One-call API: scan a directory and get the full report. */
export function score(root: string): Report {
  return buildReport(createScanContext(root));
}
