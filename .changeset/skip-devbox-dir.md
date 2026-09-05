---
"harness-score": patch
---

Skip `.devbox/` during scans. Devbox provisions this directory with binary
symlinks (e.g. `.devbox/bin/devbox`) that resolve outside the repo root,
which previously made the whole scan report incomplete via
`outside-root-symlink`.
