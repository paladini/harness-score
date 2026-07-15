import type { ScanContext } from '../types.js';
import { collectMcpConfigs } from './collectors.js';

export function mcpConfigPaths(ctx: ScanContext): string[] {
  return collectMcpConfigs(ctx).map((a) => a.path);
}
