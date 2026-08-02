import type { ScanContext } from '../types.js';
import { safeJsonParse } from '../util.js';
import { collectMcpConfigs } from './collectors.js';

export function mcpConfigPaths(ctx: ScanContext): string[] {
  return collectMcpConfigs(ctx)
    .filter((artifact) => {
      if (/(^|\/)\.continue\/config\.ya?ml$/.test(artifact.path)) {
        return /^\s*mcpServers\s*:/m.test(ctx.read(artifact.path) ?? '');
      }
      if (/(^|\/)\.kiro\/agents\/.+\.md$/.test(artifact.path)) {
        const frontmatter = (ctx.read(artifact.path) ?? '').match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1];
        return Boolean(frontmatter && /^\s*mcpServers\s*:/m.test(frontmatter));
      }
      if (/(^|\/)\.kiro\/agents\/.+\.json$/.test(artifact.path)) {
        const parsed = safeJsonParse(ctx.read(artifact.path) ?? '');
        return Boolean(
          parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'mcpServers' in parsed,
        );
      }
      if (!/(^|\/)\.gemini\/settings\.json$/.test(artifact.path)) return true;
      const content = ctx.read(artifact.path);
      const parsed = content ? safeJsonParse(content) : null;
      return Boolean(
        parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'mcpServers' in parsed,
      );
    })
    .map((artifact) => artifact.path);
}
