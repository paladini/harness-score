import { parseFrontmatter } from '../util.js';
import type { HarnessArtifact } from './collectors.js';
import type { ToolId } from './registry.js';

/**
 * Rules that a tool auto-loads without requiring any frontmatter:
 * Continue loads everything under .continue/rules/, and nested context
 * files (AGENTS.md/CLAUDE.md/GEMINI.md in subdirectories) are loaded by
 * directory scope with no metadata at all.
 */
function autoLoadsWithoutFrontmatter(path: string, toolId: ToolId): boolean {
  if (toolId === 'continue' && /(^|\/)\.continue\/rules\//.test(path)) return true;
  return /\/(AGENTS|CLAUDE|GEMINI)\.md$/.test(path);
}

/** CTX-04: rule has usable activation metadata for its tool. */
export function ruleHasValidFrontmatter(path: string, toolId: ToolId, content: string | null): boolean {
  if (autoLoadsWithoutFrontmatter(path, toolId)) return true;
  const fm = content ? parseFrontmatter(content) : null;
  if (!fm) return false;

  switch (toolId) {
    case 'cursor':
      return fm.description !== undefined || fm.alwaysApply !== undefined || fm.globs !== undefined;
    case 'windsurf':
      return fm.description !== undefined || fm.trigger !== undefined;
    case 'cline':
      return fm.paths !== undefined && fm.paths.trim().length > 0;
    case 'copilot':
      return fm.applyTo !== undefined && fm.applyTo.trim().length > 0;
    case 'continue':
      return true;
    case 'antigravity':
      return fm.description !== undefined || fm.trigger !== undefined || fm.globs !== undefined;
    default:
      return fm.description !== undefined;
  }
}

const ALWAYS_ON_TRIGGERS = new Set(['always on', 'always_on', 'always-on']);

function isGlobLike(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (ALWAYS_ON_TRIGGERS.has(v.toLowerCase())) return false;
  return v.includes('*') || v.includes('?') || v.includes('/') || v.includes('.');
}

/** CTX-05: rule is scoped to part of the tree (not blanket always-on). */
export function ruleIsScoped(
  path: string,
  toolId: ToolId,
  content: string | null,
  allRules: HarnessArtifact[],
): boolean {
  // Nested context files apply only to their subtree — scoped by construction.
  if (/\/(AGENTS|CLAUDE|GEMINI)\.md$/.test(path)) return true;
  const fm = content ? parseFrontmatter(content) : null;

  switch (toolId) {
    case 'cursor':
      return Boolean(fm?.globs);
    case 'windsurf':
      return Boolean(fm?.trigger && isGlobLike(fm.trigger));
    case 'cline':
      return Boolean(fm?.paths && fm.paths.trim().length > 2);
    case 'copilot':
      return Boolean(fm?.applyTo && isGlobLike(fm.applyTo));
    case 'continue': {
      const continueRules = allRules.filter((r) => r.toolId === 'continue');
      return continueRules.length > 1;
    }
    case 'antigravity':
      return Boolean(fm?.globs || (fm?.trigger && isGlobLike(fm.trigger)));
    default:
      return false;
  }
}

export function countRuleScopes(rules: HarnessArtifact[], read: (p: string) => string | null) {
  let scoped = 0;
  let alwaysOn = 0;
  for (const rule of rules) {
    const content = read(rule.path);
    const fm = content ? parseFrontmatter(content) : null;
    if (!fm) {
      if (ruleIsScoped(rule.path, rule.toolId, content, rules) || rule.toolId === 'continue') scoped += 1;
      continue;
    }
    if (ruleIsScoped(rule.path, rule.toolId, content, rules)) {
      scoped += 1;
    } else if (
      (rule.toolId === 'cursor' && (fm.alwaysApply ?? '').toLowerCase() === 'true') ||
      (rule.toolId === 'windsurf' && fm.trigger && ALWAYS_ON_TRIGGERS.has(fm.trigger.trim().toLowerCase()))
    ) {
      alwaysOn += 1;
    }
  }
  return { scoped, alwaysOn };
}
