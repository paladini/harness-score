# Sensors — Feedback नियंत्रण

Sensors verify करते हैं कि एजेंट ने क्या किया। वे वह loop बंद करते हैं जिससे स्व-सुधार संभव हो: अच्छे sensors वाला एजेंट अपनी गलतियाँ आपके देखने से पहले ठीक कर लेता है; sensors के बिना वह confident summary के साथ उन्हें ship कर देता है।

## Sensor stack

गति और लागत के अनुसार क्रम — सबसे तेज़ पहले — यही क्रम «quality left» सिद्धांत है:

| Sensor | Latency | Runs at |
|---|---|---|
| Type checker | ms–s | On edit (hook), pre-commit, CI |
| Linter / formatter | ms–s | On edit (hook), pre-commit, CI |
| Unit tests | s | Agent-invoked, pre-commit, CI |
| Integration/E2E tests | min | CI |
| Architecture fitness checks | s–min | CI |
| AI code review (inferential) | min, $ | PR |
| Human review | hours | PR |

लक्ष्य हर जगह सब कुछ चलाना नहीं; यह है कि हर गलती **सबसे सस्ते sensor** से, **जितनी जल्दी हो सके**, पकड़ी जाए। ऊपर की दो महँगी पंक्तियाँ उसके लिए रखें जो ऊपर कुछ भी नहीं देख सकता।

## Type checking: मुफ़्त sensor

Strict type checker एजेंट कार्य के लिए सबसे मूल्यवान sensor है — हर edit पर शून्य marginal cost, पूरी तरह deterministic, और error messages इतनी सटीक कि एजेंट स्वतंत्र रूप से कार्य कर सके।

- TypeScript: `"strict": true` — non-strict TS अधिकांश मूल्य चुपचाप खो देता है।
- Python: mypy या pyright, CI में, केवल IDE में नहीं।
- Go, Rust, Java, C#: compiler पहले से यह करता है; एजेंट done घोषित करने से पहले build करे, यह सुनिश्चित करें।

यह भाषा रणनीति का भी तर्क है: typed codebases मापने योग्य रूप से अधिक *harnessable* हैं — compiler हर एजेंट edit की मुफ़्त में देखरेख करता है।

## Tests: एजेंट जिस sensor से स्व-सुधार करता है

एजेंट के लिए test suite केवल safety net नहीं — mid-task अपना काम verify करने का उपकरण है। «अच्छे tests» का मतलब बदल जाता है:

1. **तेज़।** Seconds में चलने वाला suite हर बदलाव के बाद चलता है; 20-minute suite कभी नहीं। Fast subset (`npm test`) रखें, भले full suite धीमा हो।
2. **एक स्पष्ट command से runnable**, `AGENTS.md` में documented। Tests को तीन env vars और database चाहिए तो setup script लिखें।
3. **Deterministic।** Flaky tests एजेंट (और मनुष्य) को red ignore करना सिखाते हैं।
4. **Behavioral।** Implementation details pin करने वाले tests वैध refactors रोकते हैं; behavior pin करने वाले real regressions पकड़ते हैं। Fowler का «approved fixtures» pattern — humans review golden files, machines check — एजेंट-heavy codebases में अच्छा काम करता है।

और rule में रखने लायक convention: **नया behavior test के साथ land हो, और failing test green जाने के लिए कभी delete न हो।** अनुमति मिले तो एजेंट दोनों करेगा।

## Linters: conventions को code के रूप में encode करें

हर convention जिसे lint rule में व्यक्त कर सकें, rules files से हटा दें — linter deterministically enforce करता है, prose से बेहतर feedback loop के साथ। Modern stacks custom rules सस्ते बनाते हैं (ESLint flat config, Biome, Ruff, golangci-lint custom linters)।

एजेंट कार्य के लिए प्राथमिकता:

- *Semantic* slips पकड़ने वाले rules (unused vars, floating promises, unhandled errors) pure style से ऊपर।
- Auto-fixable rules — formatter के साथ pair करें ताकि diffs signal-only रहें।
- recurring «एजेंट बार-बार X करता रहता है» के लिए custom rules।

## Architecture fitness: structure के sensors

Fowler का दूसरा regulation dimension architectural fitness है — structure verify करने वाले sensors, केवल syntax नहीं:

- **Dependency rules**: «core कभी api से import नहीं» — ArchUnit (JVM), dependency-cruiser (JS/TS), import-linter (Python)।
- Monorepos में **module boundaries**: Nx/Turborepo boundary checks।
- **Performance budgets**: bundle size limits, query counts, p95 assertions।

Agents के साथ ये *और* महत्वपूर्ण हैं: local task optimize करता एजेंट global constraint happily तोड़ देगा जिसका किसी local file में उल्लेख नहीं। Fitness checks global constraint को local और तत्काल बनाते हैं।

## Hooks: on-edit sensors के रूप में

Cursor hooks sensors को «जब एजेंट याद करे» से «हमेशा» पर लाते हैं:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": "node ./.cursor/hooks/format-on-edit.js", "timeout": 30 }
    ]
  }
}
```

अच्छे `afterFileEdit` citizens: file format करें, उस पर linter चलाएँ, package पर type checker — failures surface करें ताकि एजेंट *अभी*, in-context ठीक करे, CI में एक घंटे बाद नहीं। Fast रखें (जहाँ संभव sub-second); slow hook हर edit पर tax लगाता है।

## CI: record का sensor

Local sensors advisory हैं — एजेंट (या merge करने वाला human) ने उन्हें चलाया, यह कुछ force नहीं करता। CI वह जगह है जहाँ sensors **facts** बनते हैं:

- हर push और PR पर tests, lint, typecheck चलाएँ।
- Required checks बनाएँ; red CI वाला agent-authored PR unreviewed काम है, draft नहीं।
- `harness-score --min-level N` job जोड़ें harness *regression* रोकने के लिए — config-drift failure जहाँ कोई hooks file delete कर दे और किसी को पता न चले ([अध्याय 7 में विवरण](./measure-and-improve#ci-gate))।

Pre-commit tooling (husky + lint-staged, `pre-commit`, lefthook) on-edit hooks और CI के बीच की खाई भरती है: commit exist होने से पहले की अंतिम deterministic check।

## Inferential sensors: AI reviewing AI

LLM-based review (Cursor का Bugbot, judge agents, review plugins) computation जो check नहीं कर सकता वहाँ अपनी लागत justify करता है: क्या यह बदलाव *सही* चीज़ का मतलब है? क्या यह abstraction sane है? दो rules इसे honest रखते हैं:

1. Computational stack को supplement करता है, कभी substitute नहीं। compile न होने वाले code approve करने वाला AI reviewer theater है।
2. Findings *spot-checkable* होने चाहिए — file:line cite करने और failure scenario बताने वाले reviewers को vibes emit करने वालों पर प्राथमिकता दें।

## स्व-सुधार loop, पूरा

Stack लगने पर LangChain ने explicitly engineer किया loop स्वाभाविक उभरता है: एजेंट edit → hooks format और lint → fast tests → CI सब re-verify → inferential reviewer survivors पढ़ता है। हर layer पिछली से छूटा पकड़ती है, और हर catch सबसे सस्ते बिंदु पर। अभी भी खाली है dangerous actions को detectable के बजाय impossible बनाना — वह [Guardrails](./guardrails-and-safety) है।
