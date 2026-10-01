import type { ReportDiff } from '../diff.js';
import { toolDisplayName } from '../harness/registry.js';
import { checkIsScored } from '../score.js';
import type { CheckResult, Report } from '../types.js';
import { formatIncompleteReason, reportScopeIsComplete, reportVerdict } from '../verdict.js';

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
  if (diff.presetChanged) {
    lines.push(
      yellow(
        `  ${WARN} Baseline used a different extends/rules config ${MIDDOT} some deltas below may reflect that, not repository changes.`,
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
  const becameApplicable = diff.checksChanged.filter((c) => c.change === 'became-applicable');
  const becameNotApplicable = diff.checksChanged.filter((c) => c.change === 'became-not-applicable');
  if (gained.length > 0) {
    lines.push(`    ${green('Newly passing:')} ${gained.map((c) => c.id).join(', ')}`);
  }
  if (lost.length > 0) {
    lines.push(`    ${red('Newly failing:')} ${lost.map((c) => c.id).join(', ')}`);
  }
  if (becameApplicable.length > 0) {
    lines.push(`    ${dim('Now applicable:')} ${becameApplicable.map((c) => c.id).join(', ')}`);
  }
  if (becameNotApplicable.length > 0) {
    lines.push(`    ${dim('Now not applicable:')} ${becameNotApplicable.map((c) => c.id).join(', ')}`);
  }
  if (
    gained.length === 0 &&
    lost.length === 0 &&
    becameApplicable.length === 0 &&
    becameNotApplicable.length === 0 &&
    diff.dimensions.every((d) => d.delta === 0)
  ) {
    lines.push(dim('    No change.'));
  }
  lines.push('');
  return lines;
}

function effectiveDiffers(report: Report): boolean {
  return (
    reportVerdict(report, 'effective').status !== reportVerdict(report, 'maturity').status ||
    report.effective.level.index !== report.level.index ||
    report.effective.score.percent !== report.score.percent
  );
}

function hasEffectiveScope(report: Report): boolean {
  return report.scopes.effective.some((scope) => scope !== 'repo');
}

function renderIncompleteReasons(report: Report, scope: 'maturity' | 'effective'): string[] {
  return reportVerdict(report, scope).reasons.map(
    (reason) => `    ${yellow(WARN)} ${scope}: ${formatIncompleteReason(reason)}`,
  );
}

function notApplicableChecks(checks: CheckResult[]): CheckResult[] {
  return checks.filter((check) => check.applicable === false && check.severity !== 'off');
}

function formatScopes(scopes: string[]): string {
  return scopes.join(', ');
}

export function renderTerminal(report: Report, diff?: ReportDiff | null): string {
  const lines: string[] = [];
  const levelPaint = LEVEL_COLOR[report.level.index] ?? red;
  const maturityComplete = reportScopeIsComplete(report, 'maturity');
  const effectiveComplete = reportScopeIsComplete(report, 'effective');
  const showEffective = hasEffectiveScope(report) || effectiveDiffers(report);
  lines.push('');
  lines.push(bold(`  harness-score v${report.tool.version}`) + dim(`  ${report.root}`));
  lines.push('');
  if (!maturityComplete) {
    lines.push(
      yellow(
        `  ${WARN} Maturity scan incomplete ${MIDDOT} provisional maturity results are not authoritative.`,
      ),
    );
    lines.push(...renderIncompleteReasons(report, 'maturity'));
  }
  if (showEffective && !effectiveComplete) {
    lines.push(
      yellow(
        `  ${WARN} Effective scan incomplete ${MIDDOT} provisional effective results are not authoritative.`,
      ),
    );
    lines.push(...renderIncompleteReasons(report, 'effective'));
  }
  if (!maturityComplete || (showEffective && !effectiveComplete)) {
    lines.push('');
  }
  if (maturityComplete) {
    const cappedMarker = report.level.capped ? ` ${yellow('(capped)')}` : '';
    lines.push(
      `  ${bold('Maturity:')} ${levelPaint(bold(`L${report.level.index} ${MIDDOT} ${report.level.name}`))}${cappedMarker}` +
        `   ${bold('Score:')} ${report.score.earned}/${report.score.max} (${report.score.percent}%)` +
        dim(`   scopes: ${formatScopes(report.scopes.maturity)}`),
    );
  } else {
    lines.push(
      `  ${bold('Maturity:')} ${yellow(bold('unavailable - incomplete scan'))}` +
        `   ${bold('Provisional score:')} ${report.score.earned}/${report.score.max} (${report.score.percent}%)` +
        dim(`   scopes: ${formatScopes(report.scopes.maturity)}`),
    );
  }
  if (showEffective && effectiveComplete) {
    const effPaint = LEVEL_COLOR[report.effective.level.index] ?? red;
    lines.push(
      `  ${bold('Effective:')} ${effPaint(bold(`L${report.effective.level.index} ${MIDDOT} ${report.effective.level.name}`))}` +
        `   ${bold('Score:')} ${report.effective.score.earned}/${report.effective.score.max} (${report.effective.score.percent}%)` +
        dim(`   scopes: ${formatScopes(report.scopes.effective)}`),
    );
  } else if (showEffective) {
    lines.push(
      `  ${bold('Effective:')} ${yellow(bold('unavailable - incomplete scan'))}` +
        `   ${bold('Provisional score:')} ${report.effective.score.earned}/${report.effective.score.max} (${report.effective.score.percent}%)` +
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
  if (report.preset.resolved.length > 0) {
    const extendsLabel = report.preset.extends.length > 0 ? report.preset.extends.join(', ') : 'local rules';
    const offIds = report.preset.resolved.filter((r) => r.severity === 'off').map((r) => r.id);
    const offText = offIds.length > 0 ? ` ${MIDDOT} ${offIds.join(', ')} ${ARROW} off` : '';
    lines.push(dim(`  Preset: ${extendsLabel}${offText}`));
  }
  lines.push('');
  if (diff) {
    lines.push(...renderDiffSection(diff));
  }
  if (!maturityComplete) lines.push(bold('  Provisional dimensions:'));
  for (const dimension of report.dimensions) {
    if (!dimension.applicable) {
      lines.push(`  ${dimension.title.padEnd(20)} ${dim('excluded by preset')}`);
      continue;
    }
    const pct = `${dimension.percent}%`.padStart(4);
    lines.push(
      `  ${dimension.title.padEnd(20)} ${bar(dimension.percent)} ${pct}  ${dim(`${dimension.earned}/${dimension.max} pts`)}`,
    );
  }
  lines.push('');

  const failed = report.checks.filter((c) => !c.passed && checkIsScored(c));
  const notApplicable = notApplicableChecks(report.checks);
  if (failed.length === 0) {
    lines.push(
      maturityComplete
        ? green(`  All checks passed ${MIDDOT} this repository is fully harnessed.`)
        : yellow(`  All provisional checks passed ${MIDDOT} completeness is required before a verdict.`),
    );
  } else {
    lines.push(bold(`  ${maturityComplete ? '' : 'Provisional '}Improvements (${failed.length}):`));
    for (const check of failed) {
      lines.push(`   ${red(CROSS)} ${bold(check.id)} ${check.title} ${dim(`(+${check.points} pts)`)}`);
      lines.push(`     ${check.remediation}`);
      lines.push(`     ${dim(check.evidence)}`);
      lines.push(`     ${cyan(check.docsUrl)}`);
    }
  }
  if (notApplicable.length > 0) {
    lines.push('');
    lines.push(dim(`  Not applicable (${notApplicable.length}):`));
    for (const check of notApplicable) {
      lines.push(`   ${dim(MIDDOT)} ${bold(check.id)} ${check.title}`);
      lines.push(`     ${dim(check.evidence)}`);
    }
  }
  const warningKeys = new Set<string>();
  const warnings = report.checks.flatMap((check) =>
    (check.warnings ?? [])
      .filter((warning) => {
        const key = `${warning.code}\0${warning.source ?? ''}\0${warning.message}`;
        if (warningKeys.has(key)) return false;
        warningKeys.add(key);
        return true;
      })
      .map((warning) => ({ checkId: check.id, ...warning })),
  );
  if (warnings.length > 0) {
    lines.push('');
    lines.push(yellow(bold(`  Warnings (${warnings.length}):`)));
    for (const warning of warnings) {
      const source = warning.source ? ` ${dim(`[${warning.source}]`)}` : '';
      lines.push(`   ${yellow(WARN)} ${bold(warning.checkId)} ${warning.code}: ${warning.message}${source}`);
    }
  }
  lines.push('');
  if (maturityComplete && report.level.nextLevelGaps.length > 0) {
    lines.push(`  ${bold(`To reach L${report.level.index + 1}:`)} ${report.level.nextLevelGaps.join('; ')}`);
    if (report.level.capped && report.level.capReason) {
      lines.push(yellow(`  ${WARN} ${report.level.capReason}`));
    }
    lines.push('');
  }
  return lines.join('\n');
}
