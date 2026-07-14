#!/usr/bin/env node
/**
 * Scan-time benchmark against a synthetic large repository. Not part of the
 * test suite (no pass/fail assertion) — a manual before/after measurement
 * tool for changes to scan.ts, per the distribution/perf improvement plan.
 * Run with `npm run bench` (requires `npm run build` first).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { score } from '../dist/index.js';

const FILE_COUNT = Number(process.argv[2] ?? 5000);
const ITERATIONS = Number(process.argv[3] ?? 5);

function buildSyntheticRepo(root, fileCount) {
  fs.mkdirSync(path.join(root, '.cursor', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agents\n\nThis is a benchmark fixture.\n');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'bench', version: '1.0.0' }));
  for (let i = 0; i < 10; i += 1) {
    fs.writeFileSync(
      path.join(root, '.cursor', 'rules', `rule-${i}.mdc`),
      `---\ndescription: rule ${i}\nglobs: "src/**"\n---\n\nBody text.\n`,
    );
  }
  // Bulk of the tree: a mix of source and test files spread across nested
  // directories, mirroring what a real large monorepo's `files` list looks
  // like (this is what scan.ts's walk + every check's matching() calls
  // actually have to work through).
  const perDir = 100;
  let written = 0;
  let dirIndex = 0;
  while (written < fileCount) {
    const dir = path.join(root, 'src', `module-${dirIndex}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < perDir && written < fileCount; i += 1, written += 1) {
      const isTest = i % 5 === 0;
      const name = isTest ? `file-${i}.test.ts` : `file-${i}.ts`;
      fs.writeFileSync(path.join(dir, name), `export const value${i} = ${i};\n`);
    }
    dirIndex += 1;
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-score-bench-'));
console.log(`Building synthetic repo with ~${FILE_COUNT} files at ${root} ...`);
buildSyntheticRepo(root, FILE_COUNT);

const timings = [];
for (let i = 0; i < ITERATIONS; i += 1) {
  const start = process.hrtime.bigint();
  const report = score(root);
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;
  timings.push(ms);
  console.log(
    `  run ${i + 1}/${ITERATIONS}: ${ms.toFixed(1)}ms (level ${report.level.name}, ${report.checks.length} checks)`,
  );
}

const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
console.log(`\nAverage over ${ITERATIONS} runs: ${avg.toFixed(1)}ms (${FILE_COUNT} files)`);

fs.rmSync(root, { recursive: true, force: true });
