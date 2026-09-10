#!/usr/bin/env python3
# invariant: refuse to POST if review_gate.py is non-zero so a failed lint cannot reach GitHub.
# hazard: GitHub returns 422 on APPROVE/REQUEST_CHANGES of your own PR; fall back to COMMENT.
import json
import os
import subprocess
import sys
import tempfile


def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    return p.returncode, p.stdout.strip(), p.stderr.strip()


def gh_json(args):
    rc, out, err = run(["gh"] + args)
    if rc != 0:
        sys.exit(f"gh {' '.join(args)} failed: {err or out}")
    return json.loads(out) if out else {}


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit("usage: post_review.py findings.json [--pr N]")
    findings_path = argv[0]
    pr_arg = []
    if "--pr" in argv:
        pr_arg = [argv[argv.index("--pr") + 1]]

    gate = os.path.join(os.path.dirname(os.path.abspath(__file__)), "review_gate.py")
    rc, out, err = run([sys.executable, gate, findings_path])
    if rc != 0:
        sys.exit(f"refusing to post, gate failed:\n{out}{err}")

    data = json.load(open(findings_path, encoding="utf-8"))
    verdict = data["verdict"]
    body = data["summary"]

    pr = gh_json(["pr", "view", *pr_arg, "--json", "number,author"])
    number, author = pr["number"], pr["author"]["login"]
    repo = gh_json(["repo", "view", "--json", "owner,name"])
    owner, name = repo["owner"]["login"], repo["name"]
    rc, me, err = run(["gh", "api", "user", "--jq", ".login"])
    if rc != 0:
        sys.exit(f"gh api user failed: {err}")

    event = verdict
    if me == author and verdict != "COMMENT":
        event = "COMMENT"
        body = (
            f"{body}\n\n---\n_Intended verdict: **{verdict}**. "
            f"Posted as a comment because GitHub does not allow {verdict} on the author's own PR._"
        )

    comments = [
        {"path": f["path"], "line": f["line"], "side": "RIGHT", "body": f["body"]}
        for f in data["findings"]
        if f.get("severity") != "pre-existing" and f.get("line")
    ]
    payload = {"body": body, "event": event, "comments": comments}

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tmp:
        json.dump(payload, tmp, ensure_ascii=False)
        tmp_path = tmp.name

    rc, out, err = run([
        "gh", "api", f"repos/{owner}/{name}/pulls/{number}/reviews",
        "--method", "POST", "--input", tmp_path,
    ])
    os.unlink(tmp_path)

    if rc != 0:
        msg = err or out
        if "422" in msg and comments:
            anchors = ", ".join(f"{c['path']}:{c['line']}" for c in comments)
            msg += (
                "\nhint: HTTP 422 with inline comments usually means an anchor line is not part of the diff. "
                f"Anchors sent: {anchors}. Re-anchor on a changed line from the patch or fold the finding into the summary."
            )
        sys.exit(f"review submission failed: {msg}")

    url = json.loads(out).get("html_url", "(no url returned)")
    print(f"posted: event={event} comments={len(comments)} url={url}")


if __name__ == "__main__":
    main()
