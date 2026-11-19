import type { SourcePosition } from './markdown.js';

/** Class of operational document a reference was found in. */
export type SourceArtifactKind = 'context-instruction' | 'scoped-rule' | 'skill' | 'versioned-spec';

/**
 * Closed list of reasons a reference target cannot be evaluated against the
 * repository. Each one is recorded as evidence; none is treated as a defect.
 */
export type NotEvaluableReason =
  | 'external-resource'
  | 'variable-dependent'
  | 'execution-dependent'
  | 'root-escape-attempt'
  | 'incomplete-scan'
  | 'inaccessible-local-target'
  | 'non-operational-mention';

/** What a reference points at. `null` when the text does not say. */
export type ReferenceForm =
  | 'file-path'
  | 'directory-path'
  | 'glob-pattern'
  | 'anchor-same-doc'
  | 'anchor-other-doc';

/** Where in the document the reference text was found. */
export type ReferenceSyntax = 'markdown-link' | 'inline-code' | 'code-block' | 'formal-field';

/** The five diagnostic states. */
export type ReferenceState = 'consistent' | 'inconsistent' | 'not-evaluable' | 'not-supported' | 'ambiguous';

/** A state, or `pending` while the factual check has not run yet. */
export type ReferenceStatus = ReferenceState | 'pending';

export type AmbiguityReason =
  | 'empty-destination'
  | 'no-type-indicator'
  | 'bare-name-not-found'
  | 'operational-purpose-unknown';
export type UnsupportedReason = 'unsupported-glob' | 'html-anchor' | 'non-markdown-anchor';
export type InconsistencyReason =
  | 'document-missing'
  | 'anchor-missing'
  | 'target-missing'
  | 'type-mismatch'
  | 'glob-no-match';
export type ReferenceReason = NotEvaluableReason | AmbiguityReason | UnsupportedReason | InconsistencyReason;

/**
 * Every rule a reference can end on. The values are public: they appear in the
 * JSON report and are documented one by one in packages/cli/REFERENCE-CHECK.md.
 */
export const RULES = {
  targetEmpty: 'target.empty',
  targetExternal: 'target.external',
  targetDynamic: 'target.dynamic',
  targetAbsolute: 'target.absolute',
  targetOutsideRoot: 'target.outside-root',
  pathUntyped: 'path.untyped',
  pathFile: 'path.file',
  pathDirectory: 'path.directory',
  pathFileFound: 'path.file-found',
  pathDirectoryFound: 'path.directory-found',
  pathFileMissing: 'path.file-missing',
  pathDirectoryMissing: 'path.directory-missing',
  pathTypeMismatch: 'path.type-mismatch',
  pathBareNameMissing: 'path.bare-name-missing',
  pathCodeMissing: 'path.code-missing',
  pathCodeTypeMismatch: 'path.code-type-mismatch',
  globMention: 'glob.mention',
  globUnsupported: 'glob.unsupported',
  globScope: 'glob.scope',
  globMatched: 'glob.matched',
  globNoMatch: 'glob.no-match',
  anchorSameDocument: 'anchor.same-document',
  anchorOtherDocument: 'anchor.other-document',
  anchorFound: 'anchor.found',
  anchorMissing: 'anchor.missing',
  anchorDocumentMissing: 'anchor.document-missing',
  anchorCodeDocumentMissing: 'anchor.code-document-missing',
  anchorHtml: 'anchor.html',
  anchorNonMarkdown: 'anchor.non-markdown',
  anchorUnreadable: 'anchor.unreadable',
  scanIncomplete: 'scan.incomplete',
  referenceUnsupportedType: 'reference.unsupported-type',
} as const;

export type ReferenceRule = (typeof RULES)[keyof typeof RULES];

/** One occurrence of a reference in an operational document. */
export interface ExtractedReference {
  sourceArtifact: string;
  sourceArtifactKind: SourceArtifactKind;
  /** Start of the reference text. */
  position: SourcePosition;
  syntax: ReferenceSyntax;
  form: ReferenceForm | null;
  /** The reference text as written in the document. */
  rawText: string;
  /** Repository-relative path, glob pattern or anchor slug; null when there is none. */
  normalizedTarget: string | null;
  /** Normalized heading slug, for anchors. */
  anchor: string | null;
  /** Same target read relative to the document directory, when that differs. */
  alternateTarget: string | null;
  /** True when the text has a path separator or comes from a link or formal field. */
  explicitPath: boolean;
  /** True for a glob that is an active instruction (a formal scope field). */
  operational: boolean;
  state: ReferenceStatus;
  reasonCode: ReferenceReason | null;
  /** Identifier of the rule that produced the state (see REFERENCE-CHECK.md). */
  rule: ReferenceRule;
  evidence: string;
}

/** A reference after the factual check: it always carries one of the five states. */
export type ResolvedReference = Omit<ExtractedReference, 'state'> & { state: ReferenceState };

export interface HtmlAnchor {
  name: string;
  attribute: 'name' | 'id';
  position: SourcePosition;
}

export interface ExtractionResult {
  references: ExtractedReference[];
  htmlAnchors: HtmlAnchor[];
}
