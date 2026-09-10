#!/usr/bin/env python3
# invariant: hits are Pass F candidates, never findings; always exit 0 so a detector cannot block the review.
import re
import sys

MARKERS = [
    ("suppression", re.compile(r"eslint-disable")),
    ("suppression", re.compile(r"@ts-(ignore|expect-error|nocheck)")),
    ("suppression", re.compile(r"#\s*noqa")),
    ("suppression", re.compile(r"#\s*type:\s*ignore")),
    ("suppression", re.compile(r"pylint:\s*disable")),
    ("suppression", re.compile(r"rubocop:\s*disable")),
    ("suppression", re.compile(r"@SuppressWarnings")),
    ("suppression", re.compile(r"//\s*nolint|\bnolint:")),
    ("suppression", re.compile(r"biome-ignore")),
    ("suppression", re.compile(r"#pragma\s+warning\s*\(?\s*disable", re.I)),
    ("test-dodge", re.compile(r"\.(only|skip)\s*\(")),
    ("test-dodge", re.compile(r"\b(xit|xdescribe|xtest)\s*\(")),
    ("test-dodge", re.compile(r"@pytest\.mark\.skip|@unittest\.skip")),
    ("test-dodge", re.compile(r"\bt\.Skip\s*\(")),
    ("hook-bypass", re.compile(r"--no-verify\b")),
    ("tls-bypass", re.compile(r"rejectUnauthorized\s*:\s*false|verify\s*=\s*False|InsecureSkipVerify|NODE_TLS_REJECT_UNAUTHORIZED")),
    ("type-bypass", re.compile(r"\bas\s+any\b|\bas\s+unknown\s+as\b")),
    ("error-swallow", re.compile(r"except(\s+\w+)?\s*:\s*pass\b|catch\s*(\([^)]*\))?\s*\{\s*\}")),
    ("unsafe-html", re.compile(r"dangerouslySetInnerHTML|bypassSecurityTrust")),
    ("sync-hack", re.compile(r"\btime\.sleep\s*\(|\bThread\.sleep\s*\(")),
]

FILE_RE = re.compile(r"^\+\+\+ b/(.+)$")
HUNK_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")


def main() -> int:
    path = None
    new_line = 0
    hits = 0
    for raw in sys.stdin:
        line = raw.rstrip("\n")
        m = FILE_RE.match(line)
        if m:
            path = m.group(1)
            continue
        m = HUNK_RE.match(line)
        if m:
            new_line = int(m.group(1))
            continue
        if path is None or line.startswith("---"):
            continue
        if line.startswith("+"):
            content = line[1:]
            for category, rx in MARKERS:
                if rx.search(content):
                    print(f"{path}:{new_line}\t{category}\t{content.strip()[:160]}")
                    hits += 1
                    break
            new_line += 1
        elif line.startswith("-"):
            continue
        elif line.startswith("\\"):
            continue
        else:
            new_line += 1
    print(f"scan: {hits} candidate(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
