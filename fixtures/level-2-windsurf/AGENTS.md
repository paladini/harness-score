# Agent Guide — Sample App

## What this project is

A small HTTP service that returns greetings. Single entry point in
`src/app.js`, no framework, no database.

## How to run

- `node src/app.js` starts the server on port 3000.
- There is no build step.

## Conventions

- Plain JavaScript, ES modules.
- Keep functions under 40 lines.
- Never add dependencies without asking.

## Architecture notes

- `src/app.js` — HTTP handling.
- `src/greet.js` — greeting logic, pure functions only.

## What not to touch

- `legacy/` contains the old CGI implementation kept for reference. Read it
  if you need context, but never modify it.

## Testing philosophy

- New behavior needs a test before it merges.
- Prefer table-driven tests over one function per case.
- Never delete a failing test to make the suite green; fix the code.

## Common tasks

- Add a greeting variant: edit `src/greet.js`, add a test, update this file.
- Change the port: `PORT` environment variable, defaults to 3000.
