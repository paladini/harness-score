import { describe, expect, test } from 'vitest';
import { TOOLS } from '../../../plugins/shared/tools.mjs';
import { PLUGIN_TOOL_PATHS } from '../src/harness/registry.js';

describe('plugins/shared/tools.mjs sync', () => {
  test('TOOLS paths match PLUGIN_TOOL_PATHS from the CLI harness registry', () => {
    for (const [toolId, paths] of Object.entries(PLUGIN_TOOL_PATHS)) {
      const tool = TOOLS[toolId as keyof typeof TOOLS];
      expect(tool, `missing TOOLS.${toolId}`).toBeDefined();
      expect(tool.skillsDir).toBe(paths.skillsDir);
      expect(tool.commandsDir).toBe(paths.commandsDir);
      expect(tool.mcpConfigPath).toBe(paths.mcpConfigPath);
    }
    expect(Object.keys(TOOLS).sort()).toEqual(Object.keys(PLUGIN_TOOL_PATHS).sort());
  });
});
