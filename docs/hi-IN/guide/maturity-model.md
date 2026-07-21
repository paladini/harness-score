# परिपक्वता मॉडल

यह अध्याय maturity model परिभाषित करता है — वही assessment framework जो [`npx harness-score`](./measure-and-improve) implement करता है, इसलिए यहाँ पढ़ा गया level वही है जिसे आप measure, reproduce, और gate पर लगा सकते हैं।

आकार परिचित capability-maturity patterns (DORA *capabilities*, OWASP SAMM *business functions*, CMMI *levels*) का अनुसरण करता है: **dimensions** अभ्यास के क्षेत्र measure करते हैं, **checks** निश्चित pass/fail indicators हैं, और **levels** coverage के *रूप* पर gate करते हैं — केवल raw percentage नहीं।

डिज़ाइन लक्ष्य:

- **निश्चित (deterministic)।** हर check filesystem fact है: file मौजूद है, parse होती है, pattern match। कोई model नहीं, judgment calls नहीं, network नहीं।
- **दो scores।** **Maturity** (repo-only) CI और badges के लिए official level है। **Effective** (repo ∪ optional global scopes) developer machine पर agent को likely दिखने वाला harness — [Metrics & Codes](./metrics-and-codes#scores-maturity-vs-effective) देखें।
- **Harness-agnostic, Cursor flagship example।** किसी supported AI-first tool (Cursor, Windsurf, Claude Code, Codex/Antigravity `.agents/`, OpenCode, Cline, Continue, Copilot instructions, Zed) के rules, skills, hooks, commands OR semantics से score — एक configured tool काफी। Universal harness infrastructure (tests, linters, types, CI) IDE से स्वतंत्र same control system बनाती है।
- **Grade नहीं, सीढ़ी।** Levels harness के *संरचना* (कौन-से dimensions covered) पर gate — केवल raw percentage नहीं — guides के 80 points, sensors शून्य, परिपक्वता नहीं।

## छह dimensions

108 points, छह dimensions में:

| Dimension | Points | क्या measure होता है |
|---|---|---|
| Context & Guides | 20 | AGENTS.md, rules quality और scoping |
| Skills & Commands | 17 | Procedural knowledge, explicit workflows, subagents |
| Hooks & Guardrails | 14 | Runtime-enforced gates और feedback |
| Sensors & Feedback | 20 | Tests, linter, types, formatter |
| CI Feedback | 14 | Pipeline checks, pre-commit |
| Hygiene & Safety | 23 | Secrets, env files, lockfile, license, MCP config |

हर dimension individual checks का योग है (remediations सहित पूरा catalog [अध्याय 8](./measure-and-improve#the-check-catalog) में; ID reference [अध्याय 9 — Metrics & Codes](./metrics-and-codes) में)।

## पाँच levels

### L0 · Unharnessed (harness रहित)

Repository एजेंट को कुछ नहीं देती: context file नहीं, rules नहीं, enforced checks नहीं। एजेंट यहाँ काम करते हैं — हमेशा करते हैं — पर हर session project शुरू से rediscover करता है और हर गलती जारी हो जाती है जब तक human न पकड़े। अधिकांश repositories यहीं से शुरू।

### L1 · Documented (दस्तावेज़ीकृत)

**आवश्यक: Context & Guides ≥ 40%.**

ठोस `AGENTS.md` (या equivalent): project क्या है, build और test कैसे, conventions क्या। शून्य से सबसे अधिक leverage — एक file में हर future session के लिए feedforward।

### L2 · Guided (मार्गदर्शित)

**आवश्यक: Context ≥ 60% · (Skills ≥ 30% या Hooks ≥ 30%) · Hygiene ≥ 50%.**

Guidance संरचित: valid frontmatter वाली scoped rules (`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`, या आपके tool का equivalent), और procedural knowledge की शुरुआत (skill, command/workflow, या subagent) या hook machinery। Basic hygiene — env files ignored, harness files में credential signatures नहीं। Harness code के साथ ship होता है और code की तरह review।

### L3 · Sensing (sensors के साथ)

**L2 आवश्यक, और: Sensors ≥ 60% · CI ≥ 50%.**

Feedback loop मौजूद। Tests एजेंट चला सके, linter, type checking, CI pipeline हर push re-verify। यह वह level जहाँ स्व-सुधार शुरू: एजेंट निश्चित tools से *अपना काम check* कर सकता है, pipeline जो छूटे पकड़ता है। अधिकांश teams के लिए L3 वह बिंदु जहाँ AI-assisted development risky नहीं लगता।

### L4 · Self-correcting (स्व-सुधार)

**L3 आवश्यक, और: Hooks ≥ 70% · total score ≥ 80%.**

Loop runtime पर बंद। Gate hooks destructive actions impossible बनाते हैं, discouraged नहीं; feedback hooks हर edit पर lint और format, session के अंदर। Guides, sensors, guardrails सभी छह dimensions cover। गलती अब rules, on-edit hooks, tests, type checker, CI, *और* gates — ज़्यादातर बिना human — पार करनी होगी।

## Score पढ़ना

दो repositories 65% score कर सकते हैं, संरचना बिल्कुल अलग — इसलिए levels dimensions पर gate:

- **65%, सब guides, sensors नहीं** → L1। दस्तावेज़ अच्छे, पर verify नहीं। प्राथमिकता: tests + CI, और prose नहीं।
- **65%, strong sensors, context नहीं** → L0/L1। एजेंट का काम check होता है पर हर session conventions अनुमान। प्राथमिकता: एक दोपहर `AGENTS.md` और तीन scoped rules।

Scanner सटीक print करता है कौन-सी requirement अगला level block (`To reach L3: sensors ≥ 60%; ci ≥ 50%`), सुधार का रास्ता ambiguous नहीं।

## Model जानबूझकर क्या measure नहीं करता

Determinism की सीमाओं पर ईमानदारी (Fowler का «behavior harness immature» caveat measurement पर भी):

- **आपके tests अच्छे हैं या नहीं** — केवल exist, run, gate।
- **आपकी rules सच हैं या नहीं** — stale rule fresh जैसा score।
- **Functional correctness** — static scan behavior verify नहीं कर सकता।
- **Team practice** — branch protection, review culture, agent workflows repository tree के बाहर।

High score का मतलब reliable agent work के लिए *infrastructure* मौजूद। आवश्यक, पर्याप्त नहीं — deterministic scanner ईमानदारी से claim कर सकता है, उसकी ceiling।

## सीढ़ी का उपयोग

1. `npx harness-score` चलाएँ — level और अगले स्तर की कमियाँ।
2. एक level एक बार; हर level की requirements एक focused effort (L1: AGENTS.md → L2: rules + hygiene → L3: sensors + CI → L4: hooks)।
3. CI में level gate (`--min-level`) ताकि परिपक्वता केवल ऊपर की ओर बढ़े।
4. दिखाएँ — README बैज (`harness` · `L4`) और optional [share card](./measure-and-improve#show-your-maturity)। वही pill CI (`--badge`) या pinned static file से।

अध्याय 7 हर step check-by-check चलता है।
