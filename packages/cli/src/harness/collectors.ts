import type { ScanContext } from '../types.js';
import { compareLexically } from '../util.js';
import {
  CLAUDE_PROJECT_GUIDE_PATHS,
  CONTEXT_ROOT_FILES,
  type HarnessKind,
  matchPathSpec,
  specsForKind,
  type ToolId,
} from './registry.js';

export interface HarnessArtifact {
  path: string;
  canonicalPath: string;
  nativeDepth: number;
  toolId: ToolId;
  kind: HarnessKind;
}

function collectByKind(ctx: ScanContext, kind: HarnessKind): HarnessArtifact[] {
  const seen = new Set<string>();
  const out: HarnessArtifact[] = [];
  for (const spec of specsForKind(kind)) {
    for (const match of matchPathSpec(ctx, spec)) {
      if (seen.has(match.path)) continue;
      seen.add(match.path);
      out.push({ ...match, toolId: spec.toolId, kind });
    }
  }
  return out.sort((a, b) => compareLexically(a.path, b.path));
}

export function collectRules(ctx: ScanContext): HarnessArtifact[] {
  return collectByKind(ctx, 'rules').filter((a) => !CLAUDE_PROJECT_GUIDE_PATHS.has(a.path));
}

export function collectSkills(ctx: ScanContext): HarnessArtifact[] {
  return collectByKind(ctx, 'skills');
}

export function collectCommands(ctx: ScanContext): HarnessArtifact[] {
  return collectByKind(ctx, 'commands');
}

export function collectSubagents(ctx: ScanContext): HarnessArtifact[] {
  return collectByKind(ctx, 'subagents');
}

export function collectHookConfigs(ctx: ScanContext): HarnessArtifact[] {
  return collectByKind(ctx, 'hooks');
}

export function collectMcpConfigs(ctx: ScanContext): HarnessArtifact[] {
  return collectByKind(ctx, 'mcp');
}

export function contextRootFile(ctx: ScanContext): string | null {
  for (const candidate of CONTEXT_ROOT_FILES) {
    if (ctx.has(candidate)) return candidate;
  }
  return null;
}

/** Tools with at least one harness artifact anywhere in the tree. */
export function detectHarnesses(ctx: ScanContext): ToolId[] {
  const tools = new Set<ToolId>();
  if (ctx.has('GEMINI.md')) tools.add('antigravity');
  if (ctx.has('CLAUDE.md') || ctx.has('.claude/CLAUDE.md') || ctx.has('.claude/AGENTS.md')) {
    tools.add('claude-code');
  }
  for (const kind of ['rules', 'skills', 'commands', 'subagents', 'hooks', 'mcp'] as HarnessKind[]) {
    for (const spec of specsForKind(kind)) {
      if (matchPathSpec(ctx, spec).length > 0) tools.add(spec.toolId);
    }
  }
  return [...tools].sort();
}

export function summarizeArtifacts(artifacts: HarnessArtifact[], label: string): string {
  if (artifacts.length === 0) return `No ${label} found.`;
  const preview = artifacts
    .slice(0, 3)
    .map((a) => a.path)
    .join(', ');
  const suffix = artifacts.length > 3 ? ', …' : '';
  const tools = [...new Set(artifacts.map((a) => a.toolId))].join(', ');
  return `Found ${artifacts.length} ${label} (${tools}): ${preview}${suffix}`;
}

/** All harness text files to scan for credential signatures (HYG-06). */
export function collectHarnessTextFiles(ctx: ScanContext): string[] {
  const files = new Set<string>();
  for (const f of CONTEXT_ROOT_FILES) {
    if (ctx.has(f)) files.add(f);
  }
  if (ctx.has('README.md')) files.add('README.md');
  for (const a of collectRules(ctx)) files.add(a.path);
  for (const a of collectSkills(ctx)) files.add(a.path);
  for (const a of collectCommands(ctx)) files.add(a.path);
  for (const a of collectSubagents(ctx)) files.add(a.path);
  for (const a of collectHookConfigs(ctx)) files.add(a.path);
  return [...files].sort();
}
