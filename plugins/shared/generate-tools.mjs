#!/usr/bin/env node
/**
 * Writes plugins/shared/tool-paths.mjs from the CLI harness registry.
 * Usage: node plugins/shared/generate-tools.mjs [--check]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN_TOOL_PATHS } from '../../packages/cli/dist/harness/registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(here, 'tool-paths.mjs');

const LABELS = {
  cursor: 'Cursor',
  'claude-code': 'Claude Code',
  windsurf: 'Windsurf',
};

function formatKey(id) {
  return /^[A-Za-z_$][\w$]*$/.test(id) ? id : `'${id}'`;
}

function render() {
  const entries = Object.entries(PLUGIN_TOOL_PATHS)
    .map(([id, paths]) => {
      const label = LABELS[id] ?? id;
      return `  ${formatKey(id)}: {
    label: '${label}',
    skillsDir: '${paths.skillsDir}',
    commandsDir: '${paths.commandsDir}',
    mcpConfigPath: '${paths.mcpConfigPath}',
  },`;
    })
    .join('\n');

  return `/**
 * GENERATED — do not edit. Path hints per supported tool, mirrored from
 * packages/cli/src/harness/registry.ts (PLUGIN_TOOL_PATHS).
 * Regenerate with: node plugins/shared/generate-tools.mjs
 */
export const TOOL_PATHS = {
${entries}
};
`;
}

const check = process.argv.includes('--check');
const next = render();
if (check) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
  if (current !== next) {
    console.error(
      'plugins/shared/tool-paths.mjs is out of sync with harness registry — run: node plugins/shared/generate-tools.mjs',
    );
    process.exit(1);
  }
  console.log('plugins/shared/tool-paths.mjs is in sync');
} else {
  fs.writeFileSync(outPath, next);
  console.log(`Wrote ${outPath}`);
}
