#!/usr/bin/env node
/**
 * Writes plugins/shared/tools.mjs from the CLI harness registry.
 * Usage: node plugins/shared/generate-tools.mjs [--check]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN_TOOL_PATHS } from '../../packages/cli/dist/harness/registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(here, 'tools.mjs');

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
 * Plugin path hints — must stay in sync with packages/cli/src/harness/registry.ts
 * (PLUGIN_TOOL_PATHS). Regenerate with: node plugins/shared/generate-tools.mjs
 */
export const TOOLS = {
${entries}
};
`;
}

const check = process.argv.includes('--check');
const next = render();
if (check) {
  const current = fs.readFileSync(outPath, 'utf8');
  if (current !== next) {
    console.error(
      'plugins/shared/tools.mjs is out of sync with harness registry — run: node plugins/shared/generate-tools.mjs',
    );
    process.exit(1);
  }
  console.log('plugins/shared/tools.mjs is in sync');
} else {
  fs.writeFileSync(outPath, next);
  console.log(`Wrote ${outPath}`);
}
