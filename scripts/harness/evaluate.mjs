import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { git, paths, ROOT, VERSION } from './common.mjs';

export const SCENARIOS = ['simple', 'tested-fix', 'docs', 'generated-plugin', 'config-dependency', 'review'];
const PROVIDERS = ['cursor', 'claude', 'codex'];
const MODES = ['baseline', 'toolkit'];
const METRICS = [
  'durationMs',
  'interventions',
  'failuresDetected',
  'falseBlocks',
  'retries',
  'checkMs',
  'contextChars',
];

function options(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '');
    if (!key || args[index + 1] === undefined)
      throw new Error(`Expected --key value, received ${args[index] ?? '<end>'}`);
    result[key] = args[index + 1];
  }
  return result;
}

function record(args) {
  const value = options(args);
  if (!PROVIDERS.includes(value.provider))
    throw new Error(`provider must be one of: ${PROVIDERS.join(', ')}`);
  if (!MODES.includes(value.mode)) throw new Error(`mode must be one of: ${MODES.join(', ')}`);
  if (!SCENARIOS.includes(value.scenario))
    throw new Error(`scenario must be one of: ${SCENARIOS.join(', ')}`);
  if (!value.runId || !value.model || !value.objective)
    throw new Error('runId, model and objective are required');
  for (const metric of METRICS) {
    value[metric] = Number(value[metric]);
    if (!Number.isFinite(value[metric]) || value[metric] < 0)
      throw new Error(`${metric} must be a non-negative number`);
  }
  value.toolkitVersion = value.mode === 'toolkit' ? VERSION : null;
  value.head = git(ROOT, ['rev-parse', 'HEAD']).trim();
  value.recordedAt = new Date().toISOString();
  const destination = join(paths(ROOT).cache, 'evaluation.jsonl');
  mkdirSync(dirname(destination), { recursive: true });
  appendFileSync(destination, `${JSON.stringify(value)}\n`);
  console.log(`Recorded ${value.provider}/${value.mode}/${value.scenario} in ${destination}`);
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function report() {
  const source = join(paths(ROOT).cache, 'evaluation.jsonl');
  if (!existsSync(source)) throw new Error('No evaluation records. Run harness:evaluate -- record first.');
  const records = readFileSync(source, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const latest = new Map(
    records.map((entry) => [`${entry.provider}/${entry.mode}/${entry.scenario}`, entry]),
  );
  const rows = [];
  for (const provider of PROVIDERS) {
    for (const scenario of SCENARIOS) {
      const baseline = latest.get(`${provider}/baseline/${scenario}`);
      const toolkit = latest.get(`${provider}/toolkit/${scenario}`);
      const comparable =
        Boolean(baseline && toolkit) &&
        baseline.model === toolkit.model &&
        baseline.objective === toolkit.objective;
      const overhead =
        comparable && baseline.durationMs > 0
          ? ((toolkit.durationMs - baseline.durationMs) / baseline.durationMs) * 100
          : null;
      rows.push({ provider, scenario, baseline, toolkit, comparable, overhead });
    }
  }
  const complete = rows.filter((row) => row.comparable);
  const simpleOverhead = median(
    rows.filter((row) => row.scenario === 'simple' && row.overhead !== null).map((row) => row.overhead),
  );
  const lines = [
    '# Harness Toolkit pilot evaluation',
    '',
    `Generated for commit \`${git(ROOT, ['rev-parse', 'HEAD']).trim()}\` with toolkit \`${VERSION}\`.`,
    '',
    `Coverage: ${complete.length}/${rows.length} comparable provider/scenario pairs. This is an engineering evaluation, not a statistical productivity claim.`,
    '',
    '| Provider | Scenario | Comparable | Baseline ms | Toolkit ms | Overhead | Interventions B/T | Failures B/T | False blocks B/T | Retries B/T | Check ms B/T | Context chars B/T |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const row of rows) {
    const format = (entry, key) => (entry ? entry[key] : 'missing');
    lines.push(
      `| ${row.provider} | ${row.scenario} | ${row.comparable ? 'yes' : 'no'} | ${format(row.baseline, 'durationMs')} | ${format(row.toolkit, 'durationMs')} | ${row.overhead === null ? 'missing' : `${row.overhead.toFixed(1)}%`} | ${format(row.baseline, 'interventions')}/${format(row.toolkit, 'interventions')} | ${format(row.baseline, 'failuresDetected')}/${format(row.toolkit, 'failuresDetected')} | ${format(row.baseline, 'falseBlocks')}/${format(row.toolkit, 'falseBlocks')} | ${format(row.baseline, 'retries')}/${format(row.toolkit, 'retries')} | ${format(row.baseline, 'checkMs')}/${format(row.toolkit, 'checkMs')} | ${format(row.baseline, 'contextChars')}/${format(row.toolkit, 'contextChars')} |`,
    );
  }
  lines.push(
    '',
    `Median simple-scenario overhead: ${simpleOverhead === null ? 'missing' : `${simpleOverhead.toFixed(1)}%`}.`,
    '',
  );
  const destination = join(paths(ROOT).cache, 'evaluation-report.md');
  writeFileSync(destination, `${lines.join('\n')}\n`);
  console.log(`Wrote ${destination}`);
  if (complete.length !== rows.length) process.exitCode = 2;
}

const [action, ...args] = process.argv.slice(2);
if (action === 'record') record(args);
else if (action === 'report') report();
else
  throw new Error(
    'Use record --runId ... --provider cursor|claude|codex --mode baseline|toolkit --scenario ... --model ... --objective ... plus all numeric metrics, or report.',
  );
