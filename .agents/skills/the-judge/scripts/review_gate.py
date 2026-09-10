#!/usr/bin/env python3
# invariant: stdlib only, no network. A gate that can fail open via a missing import is not a gate.
import json
import re
import sys
import unicodedata

SEVERITIES = ("blocker", "should-fix", "nit", "pre-existing")
EMOJI = {"blocker": "\U0001F534", "should-fix": "\U0001F7E0", "nit": "\U0001F7E1", "pre-existing": "\U0001F7E3"}
VERDICTS = ("APPROVE", "COMMENT", "REQUEST_CHANGES")
MAX_NITS = 5
CAPS = {"blocker": (900, 10), "should-fix": (900, 10), "nit": (400, 10), "pre-existing": (900, 10)}

BANNED_WORDS = [
    "obviously", "simply", "delve", "seamless", "streamline", "leverage", "crucial",
    "pivotal", "tapestry", "foster", "landscape", "furthermore", "moreover", "kudos",
    "awesome", "sorry", "apologies", "obviamente", "simplesmente", "ademais",
    "parabens", "desculpe", "desculpa",
]
BANNED_PHRASES = [
    "you forgot", "you missed", "great job", "nice work", "good catch",
    "hope this helps", "let me know", "feel free", "happy to", "it's worth noting",
    "its worth noting", "worth noting", "note that", "just a heads up",
    "as you can see", "thanks for", "thank you for", "i think maybe",
    "perhaps consider", "you might want to", "it would be beneficial", "testament to",
    "otimo trabalho", "bom trabalho", "espero que ajude", "fique a vontade",
    "sinta-se a vontade", "vale ressaltar", "vale a pena notar", "vale notar",
    "note que", "alem disso", "voce esqueceu", "com toda certeza",
]
NOT_BUT = [
    re.compile(r"\b(not|isn'?t|doesn'?t|don'?t|aren'?t|wasn'?t)\s+(just|only|merely)\b.{0,80}\bbut\b", re.S),
    re.compile(r"\bnao (apenas|so|somente)\b.{0,80}\bmas\b", re.S),
]
BANNED_OPENERS = [
    "let me", "i'll", "i will", "looking at", "first,", "so,", "sure", "ok,",
    "okay", "great", "vou ", "deixa eu", "primeiramente", "olhando", "bom,",
]
INTERNAL_REF = re.compile(r"^.+:\d+$")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower()


def strip_code(s: str) -> str:
    s = re.sub(r"```.*?```", " ", s, flags=re.S)
    s = re.sub(r"`[^`\n]*`", " ", s)
    return s


def text_violations(raw: str, label: str) -> list:
    out = []
    stripped = strip_code(raw)
    if "\u2014" in stripped or "\u2013" in stripped:
        out.append(f"{label}: em/en dash found")
    if "!" in stripped:
        out.append(f"{label}: exclamation mark found")
    n = norm(stripped)
    for w in BANNED_WORDS:
        if re.search(r"\b" + re.escape(w) + r"\b", n):
            out.append(f"{label}: banned word '{w}'")
    for p in BANNED_PHRASES:
        if p in n:
            out.append(f"{label}: banned phrase '{p}'")
    for rx in NOT_BUT:
        if rx.search(n):
            out.append(f"{label}: 'not just X but Y' construction")
    return out


def opener_violation(body: str, label: str) -> list:
    first = body.strip()
    for e in EMOJI.values():
        first = first.replace(e, "", 1)
    first = norm(first.strip().split("\n", 1)[0])
    for op in BANNED_OPENERS:
        if first.startswith(op):
            return [f"{label}: first line opens with '{op.strip()}' (state the problem instead)"]
    return []


def check_finding(i: int, f: dict) -> list:
    v = []
    sev = f.get("severity")
    label = f"F{i} ({f.get('path', '?')}:{f.get('line', '-')})"
    if sev not in SEVERITIES:
        return [f"{label}: invalid severity '{sev}'"]
    body = f.get("body", "")
    if not body.strip():
        return [f"{label}: empty body"]
    if not body.strip().startswith(EMOJI[sev]):
        v.append(f"{label}: body must start with {EMOJI[sev]} for severity '{sev}'")
    if sev == "pre-existing":
        if f.get("line") is not None:
            v.append(f"{label}: pre-existing findings are summary-only, remove 'line'")
    else:
        if not f.get("path") or not isinstance(f.get("line"), int) or f["line"] < 1:
            v.append(f"{label}: '{sev}' requires 'path' and integer 'line' >= 1 anchored on the diff")
    ev = f.get("evidence") or []
    if sev in ("blocker", "should-fix") and not ev:
        v.append(f"{label}: '{sev}' requires at least one evidence entry")
    for e in ev:
        t, ref = e.get("type"), e.get("ref", "")
        if t == "internal" and not INTERNAL_REF.match(ref):
            v.append(f"{label}: internal evidence '{ref}' must match path:line")
        elif t == "external" and not ref.startswith("https://"):
            v.append(f"{label}: external evidence must be an https URL, got '{ref}'")
        elif t == "repro" and not ref.strip():
            v.append(f"{label}: repro evidence must carry the command that reproduces the claim")
        elif t not in ("internal", "external", "repro"):
            v.append(f"{label}: evidence type must be internal, external or repro, got '{t}'")
    max_chars, max_lines = CAPS[sev]
    if len(body) > max_chars:
        v.append(f"{label}: body {len(body)} chars exceeds {max_chars} cap")
    if body.count("\n") + 1 > max_lines:
        v.append(f"{label}: body exceeds {max_lines} lines")
    v += text_violations(body, label)
    v += opener_violation(body, label)
    return v


def check_summary(summary: str) -> list:
    v = []
    if "tl;dr" not in summary.lower():
        v.append("SUMMARY: missing TL;DR section")
    if not re.search(r"lint[ -]?rule", summary, re.I):
        v.append("SUMMARY: missing 'Promote to lint rule' section (write 'none' if empty)")
    v += text_violations(summary, "SUMMARY")
    return v


def check_verdict(verdict: str, findings: list, carryover: dict) -> list:
    sevs = {f.get("severity") for f in findings}
    open_blockers = ("blocker" in sevs) or carryover.get("blocker", 0) > 0
    open_shouldfix = ("should-fix" in sevs) or carryover.get("should-fix", 0) > 0
    if open_blockers:
        expected = "REQUEST_CHANGES"
    elif open_shouldfix:
        expected = "COMMENT"
    else:
        expected = "APPROVE"
    if verdict != expected:
        return [f"VERDICT: '{verdict}' inconsistent with findings plus carryover, expected '{expected}'"]
    return []


def check_round(round_n: int, data: dict, findings: list, summary: str) -> list:
    v = []
    if not isinstance(round_n, int) or round_n < 1:
        return [f"ROUND: 'round' must be an integer >= 1, got {round_n!r}"]
    carry = data.get("carryover")
    if round_n >= 2:
        if not isinstance(carry, dict):
            v.append("ROUND: round >= 2 requires 'carryover' with counts of still-open previous findings (zeros allowed)")
        for f in findings:
            if f.get("severity") != "blocker":
                v.append(f"ROUND: round {round_n} may only post NEW blockers; '{f.get('severity')}' at {f.get('path', '?')} belongs in the Resolution table or nowhere")
        if not re.search(r"resolu", summary, re.I):
            v.append("ROUND: round >= 2 summary requires a Resolution section mapping every previous finding")
    if carry is not None:
        for k in carry:
            if k not in ("blocker", "should-fix"):
                v.append(f"ROUND: carryover key '{k}' invalid, use 'blocker' and 'should-fix'")
    return v


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: review_gate.py findings.json", file=sys.stderr)
        return 2
    try:
        data = json.loads(open(sys.argv[1], encoding="utf-8").read())
    except (OSError, json.JSONDecodeError) as e:
        print(f"malformed input: {e}", file=sys.stderr)
        return 2

    violations = []
    verdict = data.get("verdict")
    if verdict not in VERDICTS:
        violations.append(f"VERDICT: '{verdict}' not in {VERDICTS}")
    findings = data.get("findings")
    if not isinstance(findings, list):
        violations.append("SCHEMA: 'findings' must be a list")
        findings = []
    summary = data.get("summary", "")
    if not summary.strip():
        violations.append("SCHEMA: 'summary' is required")

    nits = sum(1 for f in findings if f.get("severity") == "nit")
    if nits > MAX_NITS:
        violations.append(f"NITS: {nits} nit findings exceed cap of {MAX_NITS}; fold overflow into the summary count")

    round_n = data.get("round", 1)
    carryover = data.get("carryover") or {}
    for i, f in enumerate(findings, 1):
        violations += check_finding(i, f)
    violations += check_summary(summary)
    violations += check_round(round_n, data, findings, summary)
    if verdict in VERDICTS:
        violations += check_verdict(verdict, findings, carryover)
        if verdict not in summary:
            violations.append(f"SUMMARY: TL;DR must contain the verdict token '{verdict}' verbatim")

    if violations:
        for x in violations:
            print(x)
        print(f"\ngate: FAIL ({len(violations)} violations)")
        return 1
    print(f"gate: PASS ({len(findings)} findings, verdict {verdict})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
