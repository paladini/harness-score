# Editorial glossary — Harness Score guide (internal)

Contract for translators and reviewers. English is the source of truth for check IDs, CLI output, and scanner URLs.

## Stable terms

| English | Português (Brasil) | Español (LatAm) | 简体中文 (zh-CN) | Notes |
|---|---|---|---|---|
| harness | harness | harness | harness | Keep in English; explain on first use |
| harness engineering | engenharia de harness | ingeniería de harness | harness 工程 | Same |
| feedforward | feedforward | feedforward | feedforward | Control-theory term; gloss once |
| feedback | feedback | feedback | feedback | Same |
| guides | guias | guías | 指南 | Feedforward controls |
| sensors | sensores | sensores | 传感器 | Feedback controls |
| guardrails | guardrails | guardrails | guardrails | Runtime enforcement |
| maturity level | nível de maturidade | nivel de madurez | 成熟度等级 | Always keep `L0`–`L4` |
| check | verificação / check | verificación / check | check / 检查 | Prefer "check" when tied to IDs |
| scanner | scanner | scanner | 扫描器 | Product name for CLI tool |
| self-correcting | autocorretivo | autocorrección | 自我纠正 | Level name L4 in prose only |
| OR semantics | equivalência entre ferramentas (semântica OR) | equivalencia entre herramientas (semántica OR) | 工具等价（OR 语义） | Scanner accepts Cursor *or* Claude Code equivalents |

## Level names (prose only — CLI output stays English)

| EN | pt-BR | es | zh-CN |
|---|---|---|---|
| Unharnessed | Sem harness | Sin harness | 无 harness |
| Documented | Documentado | Documentado | 已文档化 |
| Guided | Orientado | Guiado | 已引导 |
| Sensing | Com sensores | Con sensores | 有传感器 |
| Self-correcting | Autocorretivo | Autocorrección | 自我纠正 |

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
- zh-CN: mainland Simplified Chinese (简体中文); not Traditional (繁體).

## Links in translated pages

Use relative paths within the locale (`./maturity-model`, `./measure-and-improve#ctx-01`), not absolute `/guide/...` paths (those escape to English).

## Adding a locale

1. Register in `docs/.vitepress/theme/i18n/localePath.ts` (`LocaleId`, `LOCALES`, path helpers).
2. Add nav/sidebar chrome in `docs/.vitepress/config.mts`.
3. Add landing copy in `docs/.vitepress/theme/i18n/landing.ts`.
4. Mirror ten markdown files under `docs/<locale>/` (home + nine guide chapters).
5. Extend `packages/cli/test/docs.test.ts` anchor parity loop.
6. Add glossary column + tone note; run `npm test` and `npm run docs:build`.

Future example: Hindi (`hi`) — same checklist; Devanagari font coverage may need a theme tweak.
