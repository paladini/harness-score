import type { ReportDiff } from '../diff.js';
import type { Report } from '../types.js';

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
  if (gained.length > 0) {
    lines.push(`**Newly passing:** ${gained.map((c) => c.id).join(', ')}`);
  }
  if (lost.length > 0) {
    lines.push(`**Newly failing:** ${lost.map((c) => c.id).join(', ')}`);
  }
  if (gained.length === 0 && lost.length === 0 && changed.length === 0) {
    lines.push('No change since baseline.');
  }
  lines.push('');
  return lines;
}

export function renderMarkdown(report: Report, diff?: ReportDiff | null): string {
  const lines: string[] = [];
  lines.push(`# Harness Score Report`);
  lines.push('');
  lines.push(`**Maturity level:** L${report.level.index} · ${report.level.name}`);
  lines.push(`**Score:** ${report.score.earned}/${report.score.max} (${report.score.percent}%)`);
  lines.push('');
  if (diff) {
    lines.push(...renderDiffSection(diff));
  }
  lines.push('## Dimensions');
  lines.push('');
  lines.push('| Dimension | Score | % |');
  lines.push('|---|---|---|');
  for (const dimension of report.dimensions) {
    lines.push(`| ${dimension.title} | ${dimension.earned}/${dimension.max} | ${dimension.percent}% |`);
  }
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  lines.push('| | Check | Points | Evidence |');
  lines.push('|---|---|---|---|');
  for (const check of report.checks) {
    const status = check.passed ? '✅' : '❌';
    lines.push(
      `| ${status} | [${check.id}](${check.docsUrl}) ${check.title} | ${check.earned}/${check.points} | ${check.evidence.replace(/\|/g, '\\|')} |`,
    );
  }
  const failed = report.checks.filter((c) => !c.passed);
  if (failed.length > 0) {
    lines.push('');
    lines.push('## Recommended improvements');
    lines.push('');
    for (const check of failed) {
      lines.push(`- **${check.id}** — ${check.remediation} ([guide](${check.docsUrl}))`);
    }
  }
  if (report.level.nextLevelGaps.length > 0) {
    lines.push('');
    lines.push(`**To reach L${report.level.index + 1}:** ${report.level.nextLevelGaps.join('; ')}`);
  }
  lines.push('');
  return lines.join('\n');
}
