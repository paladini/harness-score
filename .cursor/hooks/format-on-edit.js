// Feedback hook: formats files the agent just edited so diffs stay clean.
// Best-effort by design — never blocks the edit.
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = payload.file_path ?? payload.filePath ?? payload.tool_input?.file_path;
    if (typeof filePath === 'string' && /\.(ts|js|mjs|json|jsonc)$/.test(filePath)) {
      const target = realpathSync(resolve(root, filePath));
      const local = relative(root, target);
      if (local.startsWith('..') || isAbsolute(local)) throw new Error('File is outside this repository');
      const biome = join(root, 'node_modules/@biomejs/biome/bin/biome');
      if (!existsSync(biome)) throw new Error('Run npm ci to install the project formatter');
      execFileSync(process.execPath, [biome, 'format', '--write', target], {
        cwd: root,
        stdio: 'pipe',
        timeout: 25_000,
      });
    }
  } catch (error) {
    console.error(`Project formatter (advisory): ${error.message}`);
  }
  process.stdout.write(JSON.stringify({}));
});
