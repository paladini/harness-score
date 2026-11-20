/**
 * Structural recognition of versioned specifications (OpenSpec layout).
 *
 * Three properties are reported side by side and never combined: whether an
 * identifiable structure exists, whether each operational document has minimum
 * content, and the states of the references those documents contain. The
 * quality of what a specification says is never judged.
 *
 * Known limits: a literal copy of an official tutorial, a specification kept in
 * a remote service, and a template whose placeholders are prose cannot be told
 * apart from real content without reading meaning into it.
 */

import type {
  ScanContext,
  SpecificationContent,
  SpecificationReport,
  SpecificationStructureStatus,
} from '../types.js';
import { type AnalysisResult, countByState } from './analyze.js';
import type { ResolvedReference } from './types.js';

const SPEC_ROOT = 'openspec';
const ATX_HEADING_RE = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const SETEXT_UNDERLINE_RE = /^ {0,3}(?:=+|-{2,})[ \t]*$/;
const LIST_ITEM_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\S/;

/**
 * Minimum content: a heading plus at least one line of content that is not a
 * heading; a `tasks.md` also needs one list item. HTML comments, blank lines and
 * frontmatter do not count.
 */
export function assessMinimumContent(
  path: string,
  content: string,
): Exclude<SpecificationContent, 'unreadable' | 'not-assessed'> {
  let text = content.startsWith('﻿') ? content.slice(1) : content;
  text = text.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  const lines = text.split(/\r\n|\r|\n/);
  let start = 0;
  if (lines[0]?.trimEnd() === '---') {
    const end = lines.findIndex((line, i) => i > 0 && (line.trimEnd() === '---' || line.trimEnd() === '...'));
    if (end !== -1) start = end + 1;
  }
  const body = lines.slice(start);
  if (body.every((line) => line.trim() === '')) return 'empty';

  const isHeading = body.map((line) => ATX_HEADING_RE.test(line));
  for (let i = 1; i < body.length; i++) {
    if (SETEXT_UNDERLINE_RE.test(body[i]!) && body[i - 1]!.trim() !== '' && !isHeading[i - 1]) {
      isHeading[i] = true;
      isHeading[i - 1] = true;
    }
  }
  const hasHeading = isHeading.some(Boolean);
  const contentLines = body.filter((line, i) => line.trim() !== '' && !isHeading[i]);
  const needsTask = /(^|\/)tasks\.md$/i.test(path);
  const hasTask = contentLines.some((line) => LIST_ITEM_RE.test(line));
  return hasHeading && contentLines.length > 0 && (!needsTask || hasTask) ? 'sufficient' : 'insufficient';
}

function isUnderSpecRoot(path: string): boolean {
  return path === SPEC_ROOT || path.startsWith(`${SPEC_ROOT}/`) || SPEC_ROOT.startsWith(`${path}/`);
}

/** Name of the change folder a document belongs to, if any. */
function changeName(path: string, archived: boolean): string | null {
  const segments = path.split('/');
  const index = archived ? 3 : 2;
  return segments.length > index + 1 ? segments[index]! : null;
}

export function assessSpecifications(ctx: ScanContext, analysis: AnalysisResult): SpecificationReport {
  const specDocuments = analysis.documents.filter((document) => document.kind === 'versioned-spec');
  const external = (ctx.incompleteReasons ?? []).some(
    (reason) =>
      reason.code === 'outside-root-symlink' && reason.path !== undefined && isUnderSpecRoot(reason.path),
  );
  const status: SpecificationStructureStatus = external
    ? 'external'
    : specDocuments.length > 0
      ? 'identified'
      : 'not-identified';

  const activeChanges = new Set<string>();
  const archivedChanges = new Set<string>();
  let specs = 0;
  for (const document of specDocuments) {
    if (document.scope === 'archived') {
      const name = changeName(document.path, true);
      if (name) archivedChanges.add(name);
    } else if (document.scope === 'operational') {
      if (document.path.startsWith(`${SPEC_ROOT}/specs/`)) specs++;
      const name = document.path.startsWith(`${SPEC_ROOT}/changes/`)
        ? changeName(document.path, false)
        : null;
      if (name) activeChanges.add(name);
    }
  }

  const minimumContent = { sufficient: 0, empty: 0, insufficient: 0, unreadable: 0 };
  const operationalReferences: ResolvedReference[] = [];
  const documents: SpecificationReport['documents'] = [];
  for (const document of specDocuments) {
    const references = analysis.references.filter((reference) => reference.sourceArtifact === document.path);
    let assessment: SpecificationContent = 'not-assessed';
    if (document.scope === 'operational') {
      const content = ctx.read(document.path);
      assessment = content === null ? 'unreadable' : assessMinimumContent(document.path, content);
      minimumContent[assessment as keyof typeof minimumContent]++;
      operationalReferences.push(...references);
    }
    documents.push({
      path: document.path,
      scope: document.scope,
      minimumContent: assessment,
      references: { total: references.length, byState: countByState(references) },
    });
  }

  return {
    structure: {
      status,
      convention: status === 'not-identified' ? null : 'openspec',
      parts: { specs, activeChanges: activeChanges.size, archivedChanges: archivedChanges.size },
    },
    documents,
    properties: {
      structure: status,
      minimumContent,
      referenceConsistency: countByState(operationalReferences),
    },
  };
}
