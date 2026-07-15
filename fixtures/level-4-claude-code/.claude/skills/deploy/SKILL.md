---
name: deploy
description: Use when the user asks to deploy or release the sample app to production; covers the full checklist from tag to smoke test.
---

# Deploying the sample app

1. Ensure the working tree is clean.
2. Tag the release: `git tag vX.Y.Z`.
3. Push tags; the deploy pipeline picks it up.
4. Smoke-test: `curl https://example.com/health` must return 200.
