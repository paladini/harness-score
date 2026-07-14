#!/usr/bin/env node
/**
 * Stamps plugins/shared/harness-engineering-recipe.md (tokens + <!-- SLOT -->
 * markers) and plugins/shared/harness-audit-command.md (verbatim, already
 * tool-agnostic) into each tool's skill/command file under plugins/<tool>/.
 *
 * `node plugins/shared/generate.mjs`         — writes the generated files.
 * `node plugins/shared/generate.mjs --check` — writes nothing; exits 1 if any
 *                                               checked-in file would differ
 *                                               from what generation produces
 *                                               (the "docs-sync for plugins"
 *                                               gate — see PLUGINS-ROADMAP.md).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS } from './tools.mjs';

const SHARED_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(SHARED_DIR, '..', '..');

const RECIPE_TEMPLATE = fs.readFileSync(path.join(SHARED_DIR, 'harness-engineering-recipe.md'), 'utf8');
const COMMAND_CONTENT = fs.readFileSync(path.join(SHARED_DIR, 'harness-audit-command.md'), 'utf8');

const SLOT_RE = /<!-- SLOT:([a-z-]+) -->/g;
const TOKEN_RE = /\{\{([A-Z_]+)\}\}/g;

function renderCommand(tool) {
  if (!tool.commandFrontmatter) return COMMAND_CONTENT;
  return `---\n${tool.commandFrontmatter}\n---\n\n${COMMAND_CONTENT}`;
}

function renderSkill(tool) {
  let out = RECIPE_TEMPLATE.replace(SLOT_RE, (_match, slotName) => {
    const key = `${slotName.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())}Slot`;
    if (!(key in tool))
      throw new Error(
        `Tool "${tool.label}" is missing a value for slot "${slotName}" (expected key "${key}")`,
      );
    return tool[key];
  });
  out = out.replace(TOKEN_RE, (_match, tokenName) => {
    const key = { SKILLS_DIR: 'skillsDir', COMMANDS_DIR: 'commandsDir', MCP_CONFIG_PATH: 'mcpConfigPath' }[
      tokenName
    ];
    if (!key || !(key in tool))
      throw new Error(`Tool "${tool.label}" is missing a value for token "{{${tokenName}}}"`);
    return tool[key];
  });
  return out;
}

const checkMode = process.argv.includes('--check');
let drift = false;

for (const tool of Object.values(TOOLS)) {
  const skillPath = path.join(REPO_ROOT, tool.pluginDir, 'skills', 'harness-engineering', 'SKILL.md');
  const commandPath = path.join(REPO_ROOT, tool.pluginDir, 'commands', 'harness-audit.md');
  const generated = { [skillPath]: renderSkill(tool), [commandPath]: renderCommand(tool) };

  for (const [filePath, content] of Object.entries(generated)) {
    const relPath = path.relative(REPO_ROOT, filePath);
    if (checkMode) {
      const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
      if (existing !== content) {
        drift = true;
        console.error(`OUT OF SYNC: ${relPath} (run \`npm run plugins:generate\`)`);
      } else {
        console.log(`ok: ${relPath}`);
      }
    } else {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
      console.log(`wrote: ${relPath}`);
    }
  }
}

if (checkMode && drift) {
  console.error('\nplugins/ content is stale — run `npm run plugins:generate` and commit the result.');
  process.exit(1);
}
