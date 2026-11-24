/**
 * Minimal Markdown syntax scanner. It locates the constructs that can carry a
 * reference (links, code, HTML anchors, frontmatter fields) together with their
 * exact position, and nothing else: no rendering, no semantics.
 *
 * Positions are 1-based. A column counts Unicode code points, so an emoji is one
 * column on every platform. `\r\n`, `\r` and `\n` all end a line and a leading
 * byte-order mark is ignored, so the same text gives the same positions
 * everywhere.
 *
 * Known limits: indented (non-fenced) code blocks, constructs split across
 * lines (inline code, link destinations, multi-line HTML tags), block quotes
 * around fences, and YAML block scalars (`|`, `>`) are not recognized.
 */

export interface SourcePosition {
  line: number;
  column: number;
}

export interface TextSpan {
  text: string;
  position: SourcePosition;
}

export type MarkdownNode =
  | {
      type: 'link';
      syntax: 'inline' | 'image' | 'definition' | 'autolink';
      position: SourcePosition;
      destination: TextSpan;
    }
  | { type: 'inline-code'; position: SourcePosition; content: TextSpan }
  | { type: 'code-block'; position: SourcePosition; info: string; lines: TextSpan[] }
  | {
      type: 'html-anchor';
      position: SourcePosition;
      attribute: 'name' | 'id';
      value: TextSpan;
    }
  | { type: 'frontmatter-field'; position: SourcePosition; key: string; values: TextSpan[] }
  | { type: 'heading'; position: SourcePosition; level: number; text: TextSpan };

/**
 * Column of a UTF-16 index in a line, counting code points. Positions on one line
 * are asked for mostly left to right, so the count resumes from the last answer
 * instead of restarting at the start of the line.
 */
let columnLine = '';
let columnIndex = 0;
let columnCount = 0;
function columnOf(line: string, index: number): number {
  if (line !== columnLine || index < columnIndex) {
    columnLine = line;
    columnIndex = 0;
    columnCount = 0;
  }
  let i = columnIndex;
  while (i < index) {
    const code = line.charCodeAt(i);
    i += code >= 0xd800 && code <= 0xdbff ? 2 : 1;
    columnCount++;
  }
  columnIndex = i;
  return columnCount + 1;
}

function span(line: string, lineNo: number, start: number, end: number): TextSpan {
  return {
    text: line.slice(start, end),
    position: { line: lineNo, column: columnOf(line, start) },
  };
}

/** Position `offset` UTF-16 units into a span (for callers that split a span's text). */
export function positionWithin(textSpan: TextSpan, offset: number): SourcePosition {
  const before = textSpan.text.slice(0, offset);
  return {
    line: textSpan.position.line,
    column: textSpan.position.column + Array.from(before).length,
  };
}

/* ------------------------------------------------------------------ */
/* Frontmatter                                                         */
/* ------------------------------------------------------------------ */

function scalarSpan(line: string, lineNo: number, from: number, to: number): TextSpan | null {
  let start = from;
  let end = to;
  while (start < end && /\s/.test(line[start]!)) start++;
  while (end > start && /\s/.test(line[end - 1]!)) end--;
  if (start >= end) return null;
  const quote = line[start];
  let result: TextSpan;
  if (quote === '"' || quote === "'") {
    const close = line.indexOf(quote, start + 1);
    if (close === -1 || close >= end) return null;
    result = span(line, lineNo, start + 1, close);
  } else {
    const comment = line.slice(start, end).search(/[ \t]#/);
    if (comment !== -1) end = start + comment;
    while (end > start && /\s/.test(line[end - 1]!)) end--;
    result = span(line, lineNo, start, end);
  }
  return result.text === '' ? null : result;
}

function flowListItems(line: string, lineNo: number, open: number): TextSpan[] {
  const items: TextSpan[] = [];
  let itemStart = open + 1;
  let quote: string | null = null;
  const push = (end: number) => {
    const item = scalarSpan(line, lineNo, itemStart, end);
    if (item) items.push(item);
  };
  for (let i = open + 1; i < line.length; i++) {
    const ch = line[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ',') {
      push(i);
      itemStart = i + 1;
    } else if (ch === ']') {
      push(i);
      return items;
    }
  }
  return items;
}

/** Scans a leading `---` block; returns the index of the first body line. */
function scanFrontmatter(lines: string[], nodes: MarkdownNode[]): number {
  if (lines[0]?.trimEnd() !== '---') return 0;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i]!.trimEnd();
    if (trimmed === '---' || trimmed === '...') {
      end = i;
      break;
    }
  }
  if (end === -1) return 0;

  for (let i = 1; i < end; i++) {
    const line = lines[i]!;
    const match = /^([A-Za-z_][\w.-]*)[ \t]*:(?:[ \t]+|$)(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1]!;
    const rest = match[2]!;
    const valueFrom = line.length - rest.length;
    const values: TextSpan[] = [];
    const head = rest.trim();

    if (head === '' || head.startsWith('#')) {
      let next = i + 1;
      for (; next < end; next++) {
        const item = /^[ \t]*-[ \t]+(.*)$/.exec(lines[next]!);
        if (!item) {
          if (lines[next]!.trim() === '') continue;
          break;
        }
        const itemLine = lines[next]!;
        const scalar = scalarSpan(itemLine, next + 1, itemLine.length - item[1]!.length, itemLine.length);
        if (scalar) values.push(scalar);
      }
      i = next - 1;
    } else if (head.startsWith('[')) {
      values.push(...flowListItems(line, i + 1, valueFrom + rest.indexOf('[')));
    } else if (!head.startsWith('|') && !head.startsWith('>')) {
      const scalar = scalarSpan(line, i + 1, valueFrom, line.length);
      if (scalar) values.push(scalar);
    }

    nodes.push({
      type: 'frontmatter-field',
      position: { line: i + 1, column: 1 },
      key,
      values,
    });
  }
  return end + 1;
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

/** ATX heading: `## Title ##`. Group 3 is the title without markers. */
const ATX_HEADING_RE = /^( {0,3})(#{1,6})(?=[ \t]|$)[ \t]*(.*?)(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE_RE = /^ {0,3}(=+|-{2,})[ \t]*$/;
/** Lines that cannot be the text of a setext heading. */
const NOT_PARAGRAPH_RE = /^ {0,3}(?:[-*+](?:[ \t]|$)|\d+[.)](?:[ \t]|$)|[>|<=]|-{2,}|\[[^\]]+\]:)/;
const FENCE_OPEN_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
const LIST_ITEM_RE = /^ {0,3}(?:[-*+]|\d+[.)])(?:[ \t]|$)/;

/** Columns of leading whitespace; a tab advances to the next multiple of 4. */
function indentWidth(line: string): number {
  let width = 0;
  for (const ch of line) {
    if (ch === ' ') width++;
    else if (ch === '\t') width += 4 - (width % 4);
    else break;
  }
  return width;
}

/** Index after the first 4 columns of indentation, or -1 when the line is indented less. */
function indentedContentStart(line: string): number {
  let width = 0;
  let i = 0;
  while (i < line.length && width < 4) {
    if (line[i] === ' ') width++;
    else if (line[i] === '\t') width += 4 - (width % 4);
    else return -1;
    i++;
  }
  return width >= 4 ? i : -1;
}
const DEFINITION_RE = /^ {0,3}\[([^\]]+)\]:[ \t]*(<[^>]*>|\S+)/;
const AUTOLINK_RE = /<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*)>/y;
const ANCHOR_TAG_RE = /<a\b[^>]*>/iy;
// An attribute follows whitespace, so `data-id` or `aria-name` is neither `id` nor `name`.
const ANCHOR_ATTRIBUTE_RE = /(?<=\s)(name|id)\s*=\s*(?:"([^"]*)"|'([^']*)')/dgi;

function isClosingFence(line: string, fence: { char: string; length: number }): boolean {
  const match = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(line);
  return Boolean(match && match[1]![0] === fence.char && match[1]!.length >= fence.length);
}

/**
 * Lookups shared by every inline scan of one line segment, so that pathological
 * lines (thousands of unmatched `[` or backticks) are scanned in linear time.
 */
interface InlineContext {
  line: string;
  /** Start of every maximal backtick run, by run length, in increasing order. */
  runs: Map<number, number[]>;
  /** Closing `]` found for an opening `[`, per search limit; -1 when there is none. */
  closes: Map<number, Map<number, number>>;
  /** Last answer of `nextIndexOf` per searched character. */
  next: Map<string, { from: number; at: number }>;
}

function inlineContext(line: string): InlineContext {
  const runs = new Map<number, number[]>();
  for (let i = 0; i < line.length; ) {
    if (line[i] !== '`') {
      i++;
      continue;
    }
    let end = i;
    while (line[end] === '`') end++;
    const starts = runs.get(end - i);
    if (starts) starts.push(i);
    else runs.set(end - i, [i]);
    i = end;
  }
  return { line, runs, closes: new Map(), next: new Map() };
}

/** `line.indexOf(char, from)`, remembering the answer for later, larger `from`. */
function nextIndexOf(ctx: InlineContext, char: string, from: number): number {
  const cached = ctx.next.get(char);
  if (cached && from >= cached.from && (cached.at === -1 || from <= cached.at)) return cached.at;
  const at = ctx.line.indexOf(char, from);
  ctx.next.set(char, { from, at });
  return at;
}

/** First start in a sorted array that is at least `min`. */
function firstAtLeast(starts: number[], min: number): number | undefined {
  let low = 0;
  let high = starts.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (starts[mid]! < min) low = mid + 1;
    else high = mid;
  }
  return starts[low];
}

/** Code span starting at `index` (a backtick). Returns the node data and the next index. */
function codeSpanAt(
  ctx: InlineContext,
  index: number,
  limit: number,
): { start: number; end: number; next: number } | null {
  const { line } = ctx;
  let runEnd = index;
  while (runEnd < limit && line[runEnd] === '`') runEnd++;
  const size = runEnd - index;
  // The span closes at the next maximal run of exactly the same length.
  const cursor = firstAtLeast(ctx.runs.get(size) ?? [], runEnd);
  if (cursor === undefined || cursor + size > limit) return null;
  let start = runEnd;
  let end = cursor;
  const inner = line.slice(start, end);
  if (inner.length > 1 && inner.startsWith(' ') && inner.endsWith(' ') && inner.trim() !== '') {
    start++;
    end--;
  }
  return { start, end, next: cursor + size };
}

function scanInline(
  ctx: InlineContext,
  lineNo: number,
  from: number,
  to: number,
  nodes: MarkdownNode[],
): void {
  const { line } = ctx;
  let i = from;
  while (i < to) {
    const ch = line[i]!;

    if (ch === '\\') {
      i += 2;
      continue;
    }

    if (ch === '`') {
      const code = codeSpanAt(ctx, i, to);
      if (code) {
        const content = span(line, lineNo, code.start, code.end);
        nodes.push({ type: 'inline-code', position: content.position, content });
        i = code.next;
      } else {
        while (i < to && line[i] === '`') i++;
      }
      continue;
    }

    if (ch === '[' || (ch === '!' && line[i + 1] === '[')) {
      const image = ch === '!';
      const open = image ? i + 1 : i;
      const link = linkAt(ctx, open, to);
      if (link) {
        const destination = span(line, lineNo, link.destStart, link.destEnd);
        nodes.push({
          type: 'link',
          syntax: image ? 'image' : 'inline',
          position: destination.position,
          destination,
        });
        scanInline(ctx, lineNo, open + 1, link.labelEnd, nodes);
        i = link.next;
      } else {
        i = open + 1;
      }
      continue;
    }

    if (ch === '<') {
      // Sticky matches on the whole line avoid copying the rest of it at every `<`;
      // a match that would run past `to` is rejected, as if the line ended there.
      AUTOLINK_RE.lastIndex = i;
      const auto = AUTOLINK_RE.exec(line);
      if (auto && i + auto[0].length <= to) {
        const destination = span(line, lineNo, i + 1, i + 1 + auto[1]!.length);
        nodes.push({ type: 'link', syntax: 'autolink', position: destination.position, destination });
        i += auto[0].length;
        continue;
      }
      const close = nextIndexOf(ctx, '>', i);
      ANCHOR_TAG_RE.lastIndex = i;
      const tag = close !== -1 && close < to ? ANCHOR_TAG_RE.exec(line) : null;
      if (tag && i + tag[0].length <= to) {
        for (const attr of tag[0].matchAll(ANCHOR_ATTRIBUTE_RE)) {
          const range = attr.indices?.[2] ?? attr.indices?.[3];
          if (!range) continue;
          const value = span(line, lineNo, i + range[0], i + range[1]);
          nodes.push({
            type: 'html-anchor',
            position: value.position,
            attribute: attr[1]!.toLowerCase() as 'name' | 'id',
            value,
          });
        }
        i += tag[0].length;
        continue;
      }
    }

    i++;
  }
}

/**
 * The `]` that closes the `[` at `open` (skipping escapes and code spans), or -1.
 *
 * The walk from one `[` visits a fixed sequence of positions, and the walk from
 * any `[` it passes is the rest of that same sequence, so one walk settles every
 * `[` on its way. A line of unmatched `[` is therefore walked once, not once per `[`.
 */
function closeOf(ctx: InlineContext, open: number, limit: number): number {
  let closes = ctx.closes.get(limit);
  if (!closes) {
    closes = new Map();
    ctx.closes.set(limit, closes);
  }
  const known = closes.get(open);
  if (known !== undefined) return known;

  const { line } = ctx;
  const pending = [open];
  let i = open + 1;
  while (i < limit && pending.length > 0) {
    const ch = line[i]!;
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') {
      const code = codeSpanAt(ctx, i, limit);
      if (code) {
        i = code.next;
      } else {
        while (i < limit && line[i] === '`') i++;
      }
      continue;
    }
    if (ch === '[') pending.push(i);
    if (ch === ']') closes.set(pending.pop()!, i);
    i++;
  }
  for (const unmatched of pending) closes.set(unmatched, -1);
  return closes.get(open)!;
}

/** Parses `[label](destination "title")` whose `[` is at `open`. */
function linkAt(
  ctx: InlineContext,
  open: number,
  limit: number,
): { labelEnd: number; destStart: number; destEnd: number; next: number } | null {
  const { line } = ctx;
  const close = closeOf(ctx, open, limit);
  if (close === -1 || line[close + 1] !== '(') return null;

  let p = close + 2;
  while (p < limit && (line[p] === ' ' || line[p] === '\t')) p++;

  let destStart: number;
  let destEnd: number;
  if (line[p] === '<') {
    const end = nextIndexOf(ctx, '>', p + 1);
    if (end === -1 || end >= limit) return null;
    destStart = p + 1;
    destEnd = end;
    p = end + 1;
  } else {
    destStart = p;
    let parens = 0;
    while (p < limit) {
      const ch = line[p]!;
      if (ch === '\\') {
        p += 2;
        continue;
      }
      if (ch === ' ' || ch === '\t') break;
      if (ch === '(') parens++;
      if (ch === ')') {
        if (parens === 0) break;
        parens--;
      }
      p++;
    }
    destEnd = p;
  }

  while (p < limit && (line[p] === ' ' || line[p] === '\t')) p++;
  const titleOpen = line[p];
  if (titleOpen === '"' || titleOpen === "'" || titleOpen === '(') {
    const titleClose = titleOpen === '(' ? ')' : titleOpen;
    const end = nextIndexOf(ctx, titleClose, p + 1);
    if (end === -1 || end >= limit) return null;
    p = end + 1;
    while (p < limit && (line[p] === ' ' || line[p] === '\t')) p++;
  }
  if (line[p] !== ')' || p >= limit) return null;
  return { labelEnd: close, destStart, destEnd, next: p + 1 };
}

export function scanMarkdown(content: string): MarkdownNode[] {
  const text = content.startsWith('﻿') ? content.slice(1) : content;
  const lines = text.split(/\r\n|\r|\n/);
  const nodes: MarkdownNode[] = [];

  let i = scanFrontmatter(lines, nodes);
  let fence: { char: string; length: number; indent: number } | null = null;
  let block: Extract<MarkdownNode, { type: 'code-block' }> | null = null;
  let inComment = false;
  /** The previous line, when it could be the text of a setext heading. */
  let paragraph: TextSpan | null = null;
  /** An open indented code block. */
  let indented: Extract<MarkdownNode, { type: 'code-block' }> | null = null;
  /** Whether the previous line lets an indented code block start (blank, heading, closed fence). */
  let indentedMayStart = true;
  /** Inside a list, indented text continues an item instead of starting code. */
  let inList = false;

  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNo = i + 1;
    const blank = line.trim() === '';
    const mayStartIndented = indentedMayStart && !inList;
    indentedMayStart = blank || ATX_HEADING_RE.test(line);
    if (LIST_ITEM_RE.test(line)) inList = true;
    else if (!blank && indentWidth(line) === 0) inList = false;

    if (fence && block) {
      paragraph = null;
      if (isClosingFence(line, fence)) {
        fence = null;
        block = null;
        indentedMayStart = true;
        continue;
      }
      let strip = 0;
      while (strip < fence.indent && line[strip] === ' ') strip++;
      block.lines.push(span(line, lineNo, strip, line.length));
      continue;
    }

    if (indented) {
      if (blank) continue;
      const content = indentedContentStart(line);
      if (content !== -1) {
        indented.lines.push(span(line, lineNo, content, line.length));
        continue;
      }
      indented = null;
    }

    if (!inComment) {
      const open = FENCE_OPEN_RE.exec(line);
      if (open && !(open[2]![0] === '`' && open[3]!.includes('`'))) {
        fence = { char: open[2]![0]!, length: open[2]!.length, indent: open[1]!.length };
        block = {
          type: 'code-block',
          position: { line: lineNo, column: columnOf(line, open[1]!.length) },
          info: open[3]!.trim(),
          lines: [],
        };
        nodes.push(block);
        paragraph = null;
        continue;
      }
      const content = mayStartIndented && !blank ? indentedContentStart(line) : -1;
      if (content !== -1) {
        const first = span(line, lineNo, content, line.length);
        indented = { type: 'code-block', position: first.position, info: '', lines: [first] };
        nodes.push(indented);
        paragraph = null;
        continue;
      }
      const definition = DEFINITION_RE.exec(line);
      if (definition && !definition[1]!.startsWith('^')) {
        const raw = definition[2]!;
        const wrapped = raw.startsWith('<') && raw.endsWith('>');
        const start = definition[0].length - raw.length + (wrapped ? 1 : 0);
        const destination = span(line, lineNo, start, start + raw.length - (wrapped ? 2 : 0));
        nodes.push({ type: 'link', syntax: 'definition', position: destination.position, destination });
        paragraph = null;
        continue;
      }

      const atx = ATX_HEADING_RE.exec(line);
      if (atx) {
        let start = atx[1]!.length + atx[2]!.length;
        while (line[start] === ' ' || line[start] === '\t') start++;
        const title = span(line, lineNo, start, start + atx[3]!.length);
        nodes.push({ type: 'heading', position: title.position, level: atx[2]!.length, text: title });
        paragraph = null;
      } else {
        const underline = SETEXT_UNDERLINE_RE.exec(line);
        if (underline && paragraph) {
          const level = underline[1]![0] === '=' ? 1 : 2;
          nodes.push({ type: 'heading', position: paragraph.position, level, text: paragraph });
          paragraph = null;
          continue;
        }
        if (line.trim() === '' || NOT_PARAGRAPH_RE.test(line)) {
          paragraph = null;
        } else {
          const start = line.length - line.trimStart().length;
          paragraph = span(line, lineNo, start, line.trimEnd().length);
        }
      }
    } else {
      paragraph = null;
    }

    const inline = inlineContext(line);
    let cursor = 0;
    while (cursor < line.length) {
      if (inComment) {
        const end = line.indexOf('-->', cursor);
        if (end === -1) {
          cursor = line.length;
        } else {
          inComment = false;
          cursor = end + 3;
        }
        continue;
      }
      const start = line.indexOf('<!--', cursor);
      if (start === -1) {
        scanInline(inline, lineNo, cursor, line.length, nodes);
        cursor = line.length;
      } else {
        scanInline(inline, lineNo, cursor, start, nodes);
        inComment = true;
        cursor = start + 4;
      }
    }
  }

  return nodes.sort((a, b) => a.position.line - b.position.line || a.position.column - b.position.column);
}
