/**
 * Recognizes the operational documents of a repository from their paths:
 * context instructions, scoped rules, skills and versioned specifications.
 *
 * Only the position of a document is inspected, never its content. Documents
 * under example, tutorial, fixture or demo directories and archived spec
 * changes are still listed, but with a scope that keeps them out of the main
 * set of operational documents.
 */

import { matchPathSpec, PATH_SPECS } from '../harness/registry.js';
import type { ScanContext } from '../types.js';
import { compareLexically } from '../util.js';
import type { SourceArtifactKind } from './types.js';

export type DocumentScope = 'operational' | 'illustrative' | 'archived';

export interface OperationalDocument {
  /** Repository-relative POSIX path. */
  path: string;
  kind: SourceArtifactKind;
  scope: DocumentScope;
}

/** AGENTS.md / CLAUDE.md / GEMINI.md at the root or in any subdirectory. */
const CONTEXT_FILE_RE = /(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/;
/** Markdown documents of an OpenSpec layout. */
const SPEC_FILE_RE = /^openspec\/(specs|changes)\/.+\.md$/;
const ARCHIVED_SPEC_RE = /^openspec\/changes\/archive\//;

/** Directory names that mark a document as illustrative rather than operational. */
const ILLUSTRATIVE_DIRS = new Set([
  'example',
  'examples',
  'exemplo',
  'exemplos',
  'tutorial',
  'tutorials',
  'fixture',
  'fixtures',
  '__fixtures__',
  'demo',
  'demos',
  'demonstration',
  'demonstrations',
]);

function scopeOf(path: string): DocumentScope {
  const directories = path.split('/').slice(0, -1);
  if (directories.some((dir) => ILLUSTRATIVE_DIRS.has(dir.toLowerCase()))) return 'illustrative';
  if (ARCHIVED_SPEC_RE.test(path)) return 'archived';
  return 'operational';
}

export function findOperationalDocuments(ctx: ScanContext): OperationalDocument[] {
  const kinds = new Map<string, SourceArtifactKind>();
  // First classification wins, so a context file is never reported as a rule.
  const add = (path: string, kind: SourceArtifactKind) => {
    if (!kinds.has(path)) kinds.set(path, kind);
  };

  for (const file of ctx.matching(CONTEXT_FILE_RE)) add(file, 'context-instruction');
  for (const file of ctx.matching(SPEC_FILE_RE)) add(file, 'versioned-spec');
  for (const spec of PATH_SPECS) {
    if (spec.kind !== 'skills') continue;
    for (const match of matchPathSpec(ctx, spec)) add(match.path, 'skill');
  }
  for (const spec of PATH_SPECS) {
    if (spec.kind !== 'rules') continue;
    for (const match of matchPathSpec(ctx, spec)) add(match.path, 'scoped-rule');
  }

  return [...kinds]
    .map(([path, kind]) => ({ path, kind, scope: scopeOf(path) }))
    .sort((a, b) => compareLexically(a.path, b.path));
}
