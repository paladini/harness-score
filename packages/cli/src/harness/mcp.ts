import type { ScanContext } from '../types.js';
import { collectMcpConfigs } from './collectors.js';

export function mcpConfigPaths(ctx: ScanContext): string[] {
  return collectMcpConfigs(ctx)
    .filter((artifact) => {
      const content = ctx.read(artifact.path) ?? '';
      if (/\.codex\/config\.toml$/.test(artifact.canonicalPath)) {
        return /^\s*\[mcp_servers(?:\.|\])/m.test(content);
      }
      if (/opencode\.jsonc?$/.test(artifact.canonicalPath)) {
        return /["']mcp["']\s*:/.test(content);
      }
      return true;
    })
    .map((artifact) => artifact.path);
}
