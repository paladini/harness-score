import type { ReportDiff } from '../diff.js';
import { toolDisplayName } from '../harness/registry.js';
import type { Report } from '../types.js';

const useColor = process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

const paint = (code: string) => (text: string) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const bold = paint('1');
const dim = paint('2');
const red = paint('31');
const green = paint('32');
const yellow = paint('33');
const cyan = paint('36');

const MIDDOT = '\u00b7';
const ARROW = '\u2192';
const BLOCK = '\u2588';
const BLOCK_LIGHT = '\u2591';
const WARN = '\u26a0';
const CROSS = '\u2717';

const LEVEL_COLOR = [red, yellow, yellow, green, green];

function bar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  return BLOCK.repeat(filled) + BLOCK_LIGHT.repeat(width - filled);
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function renderDiffSection(diff: ReportDiff): string[] {
  const lines: string[] = [];
  lines.push(bold('  Compared to baseline:'));
  if (diff.maturityModelChanged) {
    lines.push(
      yellow(
        `  ${WARN} Baseline is from a different tool version or maturity model total ${MIDDOT} some deltas below may reflect that, not repository changes.`,
      ),
    );
  }
  lines.push(
    `    Level: L${diff.level.before} ${MIDDOT} ${diff.level.beforeName} ${ARROW} ` +
      `L${diff.level.after} ${MIDDOT} ${diff.level.afterName} (${signed(diff.level.delta)})`,
  );
  lines.push(
    `    Score: ${diff.score.before.earned}/${diff.score.before.max} (${diff.score.before.percent}%) ${ARROW} ` +
      `${diff.score.after.earned}/${diff.score.after.max} (${diff.score.after.percent}%) ` +
      `(${signed(diff.score.deltaPercent)}pp)`,
  );
  for (const d of diff.dimensions) {
    if (d.delta === 0) continue;
    lines.push(`    ${d.title.padEnd(20)} ${d.before}% ${ARROW} ${d.after}% (${signed(d.delta)}pp)`);
  }
  const gained = diff.checksChanged.filter((c) => c.change === 'newly-passing');
  const lost = diff.checksChanged.filter((c) => c.change === 'newly-failing');
  if (gained.length > 0) {
    lines.push(`    ${green('Newly passing:')} ${gained.map((c) => c.id).join(', ')}`);
  }
  if (lost.length > 0) {
    lines.push(`    ${red('Newly failing:')} ${lost.map((c) => c.id).join(', ')}`);
  }
  if (gained.length === 0 && lost.length === 0 && diff.dimensions.every((d) => d.delta === 0)) {
    lines.push(dim('    No change.'));
  }
  lines.push('');
  return lines;
}

function effectiveDiffers(report: Report): boolean {
  return (
    report.effective.level.index !== report.level.index ||
    report.effective.score.percent !== report.score.percent
  );
}

function formatScopes(scopes: string[]): string {
  return scopes.join(', ');
}

export function renderTerminal(report: Report, diff?: ReportDiff | null): string {
  const lines: string[] = [];
  const levelPaint = LEVEL_COLOR[report.level.index] ?? red;
  lines.push('');
  lines.push(bold(`  harness-score v${report.tool.version}`) + dim(`  ${report.root}`));
  lines.push('');
  if (report.truncated) {
    lines.push(
      yellow(
        `  ${WARN} Scan stopped early after hitting the file-count cap ${MIDDOT} results below may be incomplete.`,
      ),
    );
    lines.push('');
  }
  lines.push(
    `  ${bold('Maturity:')} ${levelPaint(bold(`L${report.level.index} ${MIDDOT} ${report.level.name}`))}` +
      `   ${bold('Score:')} ${report.score.earned}/${report.score.max} (${report.score.percent}%)` +
      dim(`   scopes: ${formatScopes(report.scopes.maturity)}`),
  );
  if (effectiveDiffers(report)) {
    const effPaint = LEVEL_COLOR[report.effective.level.index] ?? red;
    lines.push(
      `  ${bold('Effective:')} ${effPaint(bold(`L${report.effective.level.index} ${MIDDOT} ${report.effective.level.name}`))}` +
        `   ${bold('Score:')} ${report.effective.score.earned}/${report.effective.score.max} (${report.effective.score.percent}%)` +
        dim(`   scopes: ${formatScopes(report.scopes.effective)}`),
    );
  }
  if (report.gate === 'effective' && effectiveDiffers(report)) {
    lines.push(dim('  Gate: effective (--min-level uses the effective score)'));
  }
  const detected = report.detectedHarnesses ?? [];
  if (detected.length > 0) {
    lines.push(dim(`  Detected: ${detected.map(toolDisplayName).join(', ')}`));
  }
  lines.push('');
  if (diff) {
    lines.push(...renderDiffSection(diff));
  }
  for (const dimension of report.dimensions) {
    const pct = `${dimension.percent}%`.padStart(4);
    lines.push(
      `  ${dimension.title.padEnd(20)} ${bar(dimension.percent)} ${pct}  ${dim(`${dimension.earned}/${dimension.max} pts`)}`,
    );
  }
  lines.push('');

  const failed = report.checks.filter((c) => !c.passed);
  if (failed.length === 0) {
    lines.push(green(`  All checks passed ${MIDDOT} this repository is fully harnessed.`));
  } else {
    lines.push(bold(`  Improvements (${failed.length}):`));
    for (const check of failed) {
      lines.push(`   ${red(CROSS)} ${bold(check.id)} ${check.title} ${dim(`(+${check.points} pts)`)}`);
      lines.push(`     ${check.remediation}`);
      lines.push(`     ${dim(check.evidence)}`);
      lines.push(`     ${cyan(check.docsUrl)}`);
    }
  }
  lines.push('');
  if (report.level.nextLevelGaps.length > 0) {
    lines.push(`  ${bold(`To reach L${report.level.index + 1}:`)} ${report.level.nextLevelGaps.join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}
