# Reference check (`--references`)

Exact behavior of the reference check: which documents are read, which text
counts as a reference, and which rule decides each outcome. Everything here is
deterministic: the same files give the same report on every platform.

`harness-score --references` (or `score(root, { references: true })`) adds the
result as the `references` field of the JSON report and as a separate section
of the terminal and Markdown reports. It never changes the score, the level,
the checks or the exit code.

## 1. Documents

A file is an operational document when its repository-relative path matches,
in this order of precedence:

| Kind | Paths |
|---|---|
| `context-instruction` | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` at any depth (including `.claude/CLAUDE.md`) |
| `versioned-spec` | Markdown files under `openspec/specs/` and `openspec/changes/` |
| `skill` | The skill locations the scanner already recognizes, such as `.agents/skills/*/SKILL.md`, `.cursor/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, `.devin/skills/*/SKILL.md` |
| `scoped-rule` | The rule locations the scanner already recognizes, such as `.cursor/rules/*.mdc`, `.github/instructions/*.instructions.md`, `.windsurf/rules/*.md`, `.clinerules/*.md`, `.claude/rules/**/*.md` |

Only the path is inspected. A document is **illustrative** when any of its
directory names (compared case-insensitively) is `example`, `examples`,
`exemplo`, `exemplos`, `tutorial`, `tutorials`, `fixture`, `fixtures`,
`__fixtures__`, `demo`, `demos`, `demonstration` or `demonstrations`, and
**archived** when it is under `openspec/changes/archive/`. Illustrative and
archived documents are listed in `skipped` and their references are not checked.
A document that cannot be read is listed in `unreadable`.

## 2. Where references are found

The document is scanned for four sources. Positions are a 1-based line and a
1-based column counted in Unicode code points of the text as written. `\r\n`,
`\r` and `\n` all end a line, and a leading byte-order mark is ignored.

1. **Markdown links**: inline links, images, reference definitions
   (`[id]: target`) and autolinks (`<https://…>`). The destination is taken as
   written, without its title.
2. **Inline code** (on one line).
3. **Code blocks**:
   - fenced (`` ``` `` or `~~~`, at any indentation; closed by a fence of the
     same character and at least the same length; an unclosed fence runs to the
     end of the document);
   - indented: a line indented by at least four columns (a tab counts as up to
     four) starts a code block when the previous line is blank, a heading or a
     closed fence, or at the start of the document, and the line is not inside a
     list (there, indented text continues the item). The block continues over
     indented and blank lines. A fence takes precedence over indentation. Links
     and inline code inside a code block are literal text.
4. **Scope fields of rules**: `globs`, `paths` and `applyTo` in the frontmatter
   of `scoped-rule` documents. Values may be a scalar, a quoted scalar, a flow
   list or a block list; a scalar is split on commas that are not inside braces.

HTML comments hide their content. Headings (ATX and setext) and HTML anchors
(`<a name="…">`, `<a id="…">`) are indexed for anchor checks but are not
references themselves.

**Tokens in code.** Inline code and code block lines are split on whitespace and
on `` " ' ` = ; | & < > ( ) ``, except that a `<name>` placeholder (letters,
digits, `_`, `.`, `-`) stays inside the token, so `packages/<name>/src` is one
token. Leading `,` `:` and trailing `.` `,` `:` `!`
are removed. A trailing `:line` or `:line:column` after a known extension
(`src/app.ts:42`) is not part of the path: the file is looked up without it, and
the reference keeps its text as written. A token is a candidate when it contains
`/` or `\`, or ends with a known extension. Tokens that start with `-`, that
have no letter or digit, or that are bare words (`npm`, `test`, `$HOME`) are not
candidates.

**Known extensions:** `md mdc markdown mdx txt rst json jsonc yml yaml toml ini
cfg xml html htm css scss js mjs cjs jsx ts mts cts tsx vue svelte py rb go rs
java kt swift c h cpp hpp cs php sh bash zsh ps1 bat cmd sql lock csv svg png
jpg jpeg gif pdf tex bib ipynb gradle tf proto graphql` (compared
case-insensitively, on the last path segment, which must have a name before the
dot).

## 3. Reading a target

In this order, the first matching step decides:

1. Empty destination: `target.empty`.
2. The fragment starts at the first `#`. In links only, a query (`?…`) is
   removed and the path is percent-decoded.
3. A fragment alone (`#section`) is an anchor in the same document; an empty
   fragment is `target.empty`.
4. The path is normalized:
   - links are relative to the document's directory, except that a leading `/`
     means the repository root; code and scope fields are relative to the root,
     and a leading `/` there is an absolute path;
   - `` ` `` or `$(` → `target.dynamic` (command substitution);
   - `$NAME`, `${NAME}`, `%NAME%`, a `<name>` placeholder or a leading `~`
     → `target.dynamic`;
   - a URI scheme (`https:`, `mailto:` …) or a leading `//` → `target.external`;
   - `\\server\…`, a drive letter (`C:`) or a leading `/` read as absolute →
     `target.absolute`;
   - `\` becomes `/`; `.` and empty segments are dropped; `..` steps up, and
     stepping above the root → `target.outside-root`;
   - the result is NFC-normalized; letter case is kept.
5. A path with a fragment is an anchor in another document.
6. A path with `*`, `?`, `[`, `]`, `{`, `}` or a leading `!` is a glob (section 5).
7. A trailing `/` (or a last segment `.` or `..`) names a directory.
8. A known extension names a file.
9. Anything else is `path.untyped`.

## 4. Outcomes

Every reference ends in one of five states:

- **consistent**: the target was found;
- **inconsistent**: the target was looked for and is not there;
- **not evaluable**: the target cannot be checked locally (network, variables,
  paths outside the root, an incomplete scan, an unreadable document);
- **not supported**: the syntax is outside what this check implements;
- **ambiguous**: the text does not say enough to decide.

A missing target is reported as inconsistent only when the text names it as a
target and the scan could not have missed it. A Markdown link and a rule scope
field name their target explicitly. A path written in inline code or a code
block may be an example, an output or a file the command creates, so when it is
not found (or exists with the other type) the outcome is ambiguous
(`path.code-missing`, `path.code-type-mismatch`, `anchor.code-document-missing`)
instead of inconsistent. A path in code that is found is consistent. When the scan was incomplete (a file-count limit, or a depth limit,
unreadable directory or symlink out of the root at a path that overlaps the
target), the outcome is `scan.incomplete` instead. A target that *was* found is
consistent even when the scan was incomplete.

Paths are compared exactly, including letter case. When any scanned path is not
in NFC form, paths are compared after NFC normalization and the evidence says so.
A path in code inside a document that lives in a subdirectory is also tried
relative to that document; the evidence says which reading matched.

### Rules

Rules marked *internal* are intermediate steps and never appear in a report.

| Rule | State | Reason | Meaning |
|---|---|---|---|
| `target.empty` | ambiguous | `empty-destination` | The destination (or the anchor name) is empty. |
| `target.external` | not evaluable | `external-resource` | A URI scheme or a `//` network path. |
| `target.dynamic` | not evaluable | `variable-dependent` or `execution-dependent` | Depends on an environment variable, `~`, a `<name>` placeholder, or command substitution. |
| `target.absolute` | not evaluable | `inaccessible-local-target` | An absolute path, drive letter or UNC path. |
| `target.outside-root` | not evaluable | `root-escape-attempt` | `..` climbs above the repository root. |
| `path.untyped` | ambiguous | `no-type-indicator` | No trailing `/` and no known extension; the evidence adds whether the path exists. |
| `path.file` | *internal* | | A file reference waiting for the lookup. |
| `path.directory` | *internal* | | A directory reference waiting for the lookup. |
| `path.file-found` | consistent | | The file exists. |
| `path.directory-found` | consistent | | The directory exists (the root always does). |
| `path.file-missing` | inconsistent | `target-missing` | No such file, for a Markdown link or a scope field. |
| `path.directory-missing` | inconsistent | `target-missing` | No such directory, for a Markdown link or a scope field. |
| `path.type-mismatch` | inconsistent | `type-mismatch` | The path exists, but as a directory instead of a file, or the reverse, for a Markdown link or a scope field. |
| `path.code-missing` | ambiguous | `operational-purpose-unknown` | No such file or directory, for a path in inline code or a code block. |
| `path.code-type-mismatch` | ambiguous | `operational-purpose-unknown` | The path exists with the other type, for a path in inline code or a code block. |
| `path.bare-name-missing` | ambiguous | `bare-name-not-found` | A name without a path separator (for example `Next.js`) that is not in the repository: it may be a mention, not a path. |
| `glob.mention` | not evaluable | `non-operational-mention` | A glob written in text or code, not declared as a rule scope. |
| `glob.unsupported` | not supported | `unsupported-glob` | Negation, braces, character classes, `$` interpolation, `\`, or an empty pattern. |
| `glob.scope` | *internal* | | A glob declared in a rule's scope field, waiting for the lookup. |
| `glob.matched` | consistent | | At least one scanned file matches. |
| `glob.no-match` | inconsistent | `glob-no-match` | No scanned file matches. |
| `anchor.same-document` | *internal* | | An anchor in the same document, waiting for the lookup. |
| `anchor.other-document` | *internal* | | An anchor in another document, waiting for the lookup. |
| `anchor.found` | consistent | | A heading produces this anchor name (the evidence says when it matched only after removing accents). |
| `anchor.missing` | inconsistent | `anchor-missing` | The document exists, but no heading and no `<a name>` or `<a id>` produces this name (other HTML ids, such as `<span id>`, do not count). |
| `anchor.document-missing` | inconsistent | `document-missing` | The target document of a Markdown link does not exist. |
| `anchor.code-document-missing` | ambiguous | `operational-purpose-unknown` | The target document of an anchor written in inline code or a code block does not exist. |
| `anchor.html` | not supported | `html-anchor` | No heading matches, but an `<a name="…">` or `<a id="…">` in the target document declares this name. |
| `anchor.non-markdown` | not supported | `non-markdown-anchor` | The target is not a Markdown file (for example a line anchor such as `file.ts#L10`). |
| `anchor.unreadable` | not evaluable | `inaccessible-local-target` | The target document exists but could not be read. |
| `scan.incomplete` | not evaluable | `incomplete-scan` | Not found, and the scan may not have included it. |
| `reference.unsupported-type` | not supported | | A reference form the check does not implement. |

## 5. Glob language

A glob is matched against the full repository-relative path of every scanned
file (directories are not entries).

| Element | Meaning |
|---|---|
| literal segment | Matches exactly, case-sensitively. |
| `*` | Zero or more characters within one segment; never `/`. Consecutive `*` inside a segment count as one. |
| `?` | Exactly one Unicode code point within one segment; never `/`. |
| `**` as a whole segment | Any number of segments: zero or more at the start or in the middle (`src/**/*.ts` matches `src/a.ts`), at least one at the end (`docs/**` does not match `docs` itself). |

Names starting with a dot match `*` and `**` like any other name. Everything
else that glob dialects give special meaning to is unsupported (`glob.unsupported`),
never guessed at.

## 6. Anchors

The anchor name of a heading is its visible text (links and images reduced to
their text, code spans to their content, HTML tags and `*` `~` and `_…_`
emphasis markers removed), NFC-normalized and lowercased, with each whitespace
character turned into `-` and every character that is not a letter, mark,
number, `-` or `_` removed. A heading with no remaining characters has no
anchor. Repeated headings get `-1`, `-2`, … in document order, skipping names
already in use (`x`, `x`, `x-1` → `x`, `x-1`, `x-1-1`).

The fragment of a reference is trimmed, percent-decoded, NFC-normalized and
lowercased before the comparison. A fragment that matches a heading only after
removing accents still resolves. A fragment that matches no heading is not
supported when an `<a name="…">` or `<a id="…">` tag of the target document
declares it (an attribute counts only after whitespace, so `data-id` does not),
and inconsistent otherwise, including when the document has other HTML ids such
as `<span id="…">`. The same holds for anchors in the same document and in
another document. Only Markdown files (`.md`, `.markdown`, `.mdx`,
`.mdc`) are searched for headings.

## 7. Specifications (OpenSpec)

The `specifications` section reports three independent properties, with no
combined verdict:

- **structure**: `identified` when Markdown documents exist under
  `openspec/specs/` or `openspec/changes/`; `external` when `openspec` is a
  symlink out of the root; otherwise `not-identified`. The parts are the number
  of spec documents, active change folders and archived change folders;
- **minimum content**, per active document: `sufficient` when it has a heading
  and at least one line of content that is not a heading (a `tasks.md` also
  needs one list item); `empty` when nothing remains after removing HTML
  comments, blank lines and frontmatter; otherwise `insufficient`. Archived and
  illustrative documents are `not-assessed`;
- **reference consistency**: the states of the references found in active
  specification documents.

## 8. Guarantees

- Files are only read: no network access, no commands, no clock-dependent output.
- Nothing outside the scanned root is read or followed.
- The same files give the same report, in the same order (documents by path,
  occurrences by line and column).
- Scanning time grows linearly with the length of a line, even on pathological
  input (thousands of unmatched `[`, backticks or `<`).
- Without `--references` the output is unchanged; with it, only the
  `references` field and section are added.

## 9. Known limits

- Paths written in prose with an implicit context (a sub-folder named under its
  parent, a `foo.md` placeholder, range notation such as `level-0..4/`) are
  checked as written.
- Constructs split across lines, block quotes around code blocks, YAML block
  scalars and HTML entities in headings are not parsed.
- Links that rely on a site generator dropping the `.md` extension are checked
  as written.
- Only the OpenSpec layout is recognized. A literal copy of a template, a
  specification kept in a remote service, or placeholders written as prose
  cannot be told apart from real content.
