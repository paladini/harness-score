# Security Policy

## Scope

Harness Score's CLI (`packages/cli`) is a static filesystem scanner: it reads
files under the path you give it and never makes a network call, never
executes discovered code, and never phones home. The realistic attack
surface is narrow, but a few things are worth reporting if you find them:

- The scanner reading or evaluating something it shouldn't (e.g. a crafted
  repository path or file content causing it to escape the scanned root, or
  to execute rather than just read a file).
- A supply-chain issue in `packages/cli` — it intentionally ships with
  **zero runtime dependencies**; a PR or release that introduces one without
  discussion is itself worth flagging.
- Anything in the GitHub Action (`action/`) or the release pipeline
  (`.github/workflows/release.yml`) that could leak the OIDC/publish tokens
  it relies on.
- Any editor/agent plugin (`plugins/`) instructing the agent to do something
  destructive or credential-exposing that a user wouldn't expect from an
  "audit" command.

## Reporting a vulnerability

Please **do not open a public issue** for a suspected security problem.
Instead, email **fnpaladini@gmail.com** with:

- A description of the issue and its potential impact.
- Steps to reproduce (a minimal repository or command is ideal).
- Your assessment of severity, if you have one.

You should get an acknowledgment within a few days. Once confirmed, we'll
work on a fix and coordinate disclosure timing with you before any public
write-up.

## Supported versions

This project is pre-1.0 and moves fast; only the latest published version on
npm/JSR/GitHub Packages is supported. Please upgrade before reporting an
issue that might already be fixed.
