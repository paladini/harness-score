import type { ReportDiff } from '../diff.js';
import { toolDisplayName } from '../harness/registry.js';
import { checkIsScored } from '../score.js';
import type { CheckResult, Report } from '../types.js';
import { formatIncompleteReason, reportScopeIsComplete, reportVerdict } from '../verdict.js';

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function renderDiffSection(diff: ReportDiff): string[] {
  const lines: string[] = [];
  lines.push('## Compared to baseline');
  lines.push('');
  if (diff.maturityModelChanged) {
    lines.push(
      '> ⚠ Baseline is from a different tool version or maturity model total — some deltas below may reflect that, not repository changes.',
    );
    lines.push('');
  }
  if (diff.presetChanged) {
    lines.push(
      '> ⚠ Baseline used a different extends/rules config — some deltas below may reflect that, not repository changes.',
    );
    lines.push('');
  }
  lines.push(
    `**Level:** L${diff.level.before} · ${diff.level.beforeName} → ` +
      `L${diff.level.after} · ${diff.level.afterName} (${signed(diff.level.delta)})`,
  );
  lines.push(
    `**Score:** ${diff.score.before.earned}/${diff.score.before.max} (${diff.score.before.percent}%) → ` +
      `${diff.score.after.earned}/${diff.score.after.max} (${diff.score.after.percent}%) ` +
      `(${signed(diff.score.deltaPercent)}pp)`,
  );
  lines.push('');
  const changed = diff.dimensions.filter((d) => d.delta !== 0);
  if (changed.length > 0) {
    lines.push('| Dimension | Before | After | Δ |');
    lines.push('|---|---|---|---|');
    for (const d of changed) {
      lines.push(`| ${d.title} | ${d.before}% | ${d.after}% | ${signed(d.delta)}pp |`);
    }
    lines.push('');
  }
  const gained = diff.checksChanged.filter((c) => c.change === 'newly-passing');
  const lost = diff.checksChanged.filter((c) => c.change === 'newly-failing');
  const becameApplicable = diff.checksChanged.filter((c) => c.change === 'became-applicable');
  const becameNotApplicable = diff.checksChanged.filter((c) => c.change === 'became-not-applicable');
  if (gained.length > 0) {
    lines.push(`**Newly passing:** ${gained.map((c) => c.id).join(', ')}`);
  }
  if (lost.length > 0) {
    lines.push(`**Newly failing:** ${lost.map((c) => c.id).join(', ')}`);
  }
  if (becameApplicable.length > 0) {
    lines.push(`**Now applicable:** ${becameApplicable.map((c) => c.id).join(', ')}`);
  }
  if (becameNotApplicable.length > 0) {
    lines.push(`**Now not applicable:** ${becameNotApplicable.map((c) => c.id).join(', ')}`);
  }
  if (
    gained.length === 0 &&
    lost.length === 0 &&
    becameApplicable.length === 0 &&
    becameNotApplicable.length === 0 &&
    changed.length === 0
  ) {
    lines.push('No change since baseline.');
  }
  lines.push('');
  return lines;
}

export function renderMarkdown(report: Report, diff?: ReportDiff | null): string {
  const lines: string[] = [];
  const maturityComplete = reportScopeIsComplete(report, 'maturity');
  const effectiveComplete = reportScopeIsComplete(report, 'effective');
  const showEffective =
    report.scopes.effective.some((scope) => scope !== 'repo') ||
    effectiveComplete !== maturityComplete ||
    report.effective.level.index !== report.level.index ||
    report.effective.score.percent !== report.score.percent;
  lines.push(`# Harness Score Report`);
  lines.push('');
  if (maturityComplete) {
    lines.push(`**Maturity level:** L${report.level.index} · ${report.level.name}`);
    lines.push(`**Maturity score:** ${report.score.earned}/${report.score.max} (${report.score.percent}%)`);
  } else {
    lines.push('**Maturity:** unavailable - incomplete scan');
    lines.push(
      `**Provisional maturity score:** ${report.score.earned}/${report.score.max} (${report.score.percent}%)`,
    );
  }
  lines.push(`**Maturity scopes:** ${report.scopes.maturity.join(', ')}`);
  if (showEffective && effectiveComplete) {
    lines.push(`**Effective level:** L${report.effective.level.index} · ${report.effective.level.name}`);
    lines.push(
      `**Effective score:** ${report.effective.score.earned}/${report.effective.score.max} (${report.effective.score.percent}%)`,
    );
    lines.push(`**Effective scopes:** ${report.scopes.effective.join(', ')}`);
  } else if (showEffective) {
    lines.push('**Effective:** unavailable - incomplete scan');
    lines.push(
      `**Provisional effective score:** ${report.effective.score.earned}/${report.effective.score.max} (${report.effective.score.percent}%)`,
    );
    lines.push(`**Effective scopes:** ${report.scopes.effective.join(', ')}`);
  }
  lines.push(`**Gate:** ${report.gate}`);
  const detected = report.detectedHarnesses ?? [];
  if (detected.length > 0) {
    lines.push(`**Detected harnesses:** ${detected.map(toolDisplayName).join(', ')}`);
  }
  if (report.preset.resolved.length > 0) {
    const extendsLabel = report.preset.extends.length > 0 ? report.preset.extends.join(', ') : 'local rules';
    const offIds = report.preset.resolved.filter((r) => r.severity === 'off').map((r) => r.id);
    const offText = offIds.length > 0 ? ` — ${offIds.join(', ')} → off` : '';
    lines.push(`**Preset:** ${extendsLabel}${offText}`);
  }
  lines.push('');
  if (!maturityComplete || (showEffective && !effectiveComplete)) {
    if (!maturityComplete) {
      lines.push('> ⚠ Maturity scan is incomplete. Provisional maturity results are not authoritative.');
    }
    if (showEffective && !effectiveComplete) {
      lines.push('> ⚠ Effective scan is incomplete. Provisional effective results are not authoritative.');
    }
    lines.push('');
    lines.push('## Incomplete scan reasons');
    lines.push('');
    if (!maturityComplete) {
      for (const reason of reportVerdict(report, 'maturity').reasons) {
        lines.push(`- **maturity:** ${formatIncompleteReason(reason)}`);
      }
    }
    if (showEffective && !effectiveComplete) {
      for (const reason of reportVerdict(report, 'effective').reasons) {
        lines.push(`- **effective:** ${formatIncompleteReason(reason)}`);
      }
    }
    lines.push('');
  }
  if (diff) {
    lines.push(...renderDiffSection(diff));
  }
  lines.push(maturityComplete ? '## Dimensions' : '## Provisional dimensions');
  lines.push('');
  lines.push('| Dimension | Score | % |');
  lines.push('|---|---|---|');
  for (const dimension of report.dimensions) {
    const cell = dimension.applicable
      ? `${dimension.earned}/${dimension.max} | ${dimension.percent}%`
      : '— | N/A (excluded by preset)';
    lines.push(`| ${dimension.title} | ${cell} |`);
  }
  lines.push('');
  lines.push(maturityComplete ? '## Checks' : '## Provisional checks');
  lines.push('');
  lines.push('| | Check | Points | Evidence |');
  lines.push('|---|---|---|---|');
  for (const check of report.checks) {
    const status =
      check.severity === 'off' ? '➖' : check.applicable === false ? 'N/A' : check.passed ? '✅' : '❌';
    lines.push(
      `| ${status} | [${check.id}](${check.docsUrl}) ${check.title} | ${check.earned}/${check.points} | ${check.evidence.replace(/\|/g, '\\|')} |`,
    );
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
    lines.push('## Warnings');
    lines.push('');
    for (const warning of warnings) {
      const source = warning.source ? ` Source: \`${warning.source.replace(/`/g, '\\`')}\`.` : '';
      lines.push(`- **${warning.checkId} / ${warning.code}:** ${warning.message}${source}`);
    }
  }
  const failed = report.checks.filter((c) => !c.passed && checkIsScored(c));
  const notApplicable = report.checks.filter(
    (check: CheckResult) => check.applicable === false && check.severity !== 'off',
  );
  if (notApplicable.length > 0) {
    lines.push('');
    lines.push('## Not applicable');
    lines.push('');
    for (const check of notApplicable) {
      lines.push(`- **${check.id}** — ${check.evidence}`);
    }
  }
  if (failed.length > 0) {
    lines.push('');
    lines.push('## Recommended improvements');
    lines.push('');
    for (const check of failed) {
      lines.push(`- **${check.id}** — ${check.remediation} ([guide](${check.docsUrl}))`);
    }
  }
  if (maturityComplete && report.level.nextLevelGaps.length > 0) {
    lines.push('');
    lines.push(`**To reach L${report.level.index + 1}:** ${report.level.nextLevelGaps.join('; ')}`);
    if (report.level.capped && report.level.capReason) {
      lines.push('');
      lines.push(`> ⚠ **Capped:** ${report.level.capReason}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
