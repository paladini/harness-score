# Editorial glossary — Harness Score guide (internal)

Contract for translators and reviewers. English is the source of truth for check IDs, CLI output, and scanner URLs.

## Stable terms

| English | Português (Brasil) | Español (LatAm) | Notes |
|---|---|---|---|
| harness | harness | harness | Keep in English; explain on first use |
| harness engineering | engenharia de harness | ingeniería de harness | Same |
| feedforward | feedforward | feedforward | Control-theory term; gloss once |
| feedback | feedback | feedback | Same |
| guides | guias | guías | Feedforward controls |
| sensors | sensores | sensores | Feedback controls |
| guardrails | guardrails | guardrails | Runtime enforcement |
| maturity level | nível de maturidade | nivel de madurez | Always keep `L0`–`L4` |
| check | verificação / check | verificación / check | Prefer "check" when tied to IDs |
| scanner | scanner | scanner | Product name for CLI tool |
| self-correcting | autocorretivo | autocorrección | Level name L4 in prose only |
| OR semantics | equivalência entre ferramentas (semântica OR) | equivalencia entre herramientas (semántica OR) | Scanner accepts Cursor *or* Claude Code equivalents |

## Level names (prose only — CLI output stays English)

| EN | pt-BR | es |
|---|---|---|
| Unharnessed | Sem harness | Sin harness |
| Documented | Documentado | Documentado |
| Guided | Orientado | Guiado |
| Sensing | Com sensores | Con sensores |
| Self-correcting | Autocorretivo | Autocorrección |

## Never translate

- Check IDs: `CTX-01`, `SKL-01`, etc.
- Anchor slugs: `{#ctx-01}`, `{#ci-gate}`, etc.
- File paths: `AGENTS.md`, `.cursor/rules/*.mdc`, `hooks.json`
- CLI commands, flags, JSON keys, code blocks
- Scanner example terminal output (level names in sample output)
- `npx harness-score`, package names, GitHub URLs
- Dimension names in CLI sample output (keep English in code blocks)

## Tone

- Short sentences; active voice.
- First jargon mention: plain-language gloss + stable term after.
- Professional and accessible — not marketing hype, not academic.
- pt-BR: Brazilian Portuguese (not European).
- es: neutral Latin American (tú/ustedes; avoid vosotros, ordenador, fichero).

## Links in translated pages

Use relative paths within the locale (`./maturity-model`, `./measure-and-improve#ctx-01`), not absolute `/guide/...` paths (those escape to English).
