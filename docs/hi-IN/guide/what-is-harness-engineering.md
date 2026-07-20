# Harness engineering क्या है

> एक एजेंट = मॉडल + harness। मॉडल आप rent करते हैं; harness आपका अपना होता है।

जब कोई AI coding एजेंट आपके रिपॉज़िटरी में काम करता है, तो उसका व्यवहार केवल मॉडल से नहीं आता। बाकी हिस्सा मॉडल के *आस-पास* की चीज़ों से आता है — वे निर्देश जो वह लोड करता है, टूल जिन्हें वह चला सकता है, आउटपुट पर चलने वाली checks, और वे gates जो नुकसान पहुँचाने वाले काम रोकते हैं। इस पूरे घेरे को **harness** कहते हैं; इसे जानबूझकर बनाना **harness engineering** है।

यह शब्द 2026 की शुरुआत में स्पष्ट हुआ। Martin Fowler की साइट ने
[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
(पहले के
[memo](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html)
पर आधारित) प्रकाशित किया,
जो उन टीमों के लिए यह discipline परिभाषित करता है जो एजेंट *उपयोग* करती हैं। लगभग उसी समय LangChain ने सिक्के का दूसरा पहलू दिखाया: coding एजेंट का harness सुधारकर — मॉडल को छुए बिना — उन्होंने Terminal Bench 2.0 पर **52.8% से 66.5%** तक पहुँचा, top 30 से बाहर से top 5 में
([Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering))।

दोनों से मुख्य insight: **reliability मॉडल weights की property नहीं, बल्कि पूरे model–harness–environment system की property है**। अच्छी तरह harness वाली रिपॉज़िटरी mediocre मॉडल को उपयोगी बना देती है; harness रहित रिपॉज़िटरी frontier मॉडल को खतरनाक बना सकती है।

## Guides और Sensors

Fowler का framework harness controls को दो परिवारों में बाँटता है, control theory से उधार:

| | **Guides** (feedforward) | **Sensors** (feedback) |
|---|---|---|
| कब | एजेंट के काम करने से *पहले* | एजेंट के काम करने के *बाद* |
| उद्देश्य | अच्छे परिणामों की ओर मार्गदर्शन | गलतियों का पता लगाना और सुधार |
| उदाहरण (tool-agnostic) | `AGENTS.md`, rules, skills, commands, MCP context | tests, linters, type checkers, CI, hooks |
| अनुपस्थित होने पर failure mode | एजेंट आपकी conventions अनुमान लगाता है | एजेंट गलतियाँ confidently ship करता है |

ये सिद्धांत Cursor, Claude Code, Windsurf और किसी भी AI coding tool में समान हैं — फर्क केवल *कहाँ* configure करें (अलग directories और frontmatter formats), *क्या* बनाएँ उसमें नहीं। Harness Score OR semantics से इन tool-specific variants को पहचानता है, ताकि आपका harness हर जगह काम करे।

harness को दोनों चाहिए। Guides बिना sensors के confident, unverified output देते हैं। Sensors बिना guides के वही गलतियाँ बार-बार पकड़ते हैं, क्योंकि एजेंट को कभी बताया ही नहीं गया कि उनसे कैसे बचें।

## Computational vs inferential checks

Fowler एक और अंतर करता है, जिसे यह guide — और `harness-score` scanner — गंभीरता से लेता है:

- **Computational checks** deterministic होती हैं: linters, type checkers, tests, structural analysis। milliseconds से seconds में चलती हैं, लागत शून्य, हर बार वही जवाब। ये *हर जगह* होनी चाहिए: hooks, pre-commit, CI में।
- **Inferential checks** मॉडल उपयोग करती हैं: AI code review, LLM-as-judge, semantic audits। powerful हैं पर slow, costly और probabilistic। जहाँ semantics मायने रखती हैं और computation नहीं पहुँच पाता, वहाँ उपयोग करें।

रणनीतिक सिद्धांत **"keep quality left"** है: fast, cheap, deterministic checks को loop में जितना जल्दी हो सके धकेला जाए, और inferential judgment बचे हुए काम के लिए रखा जाए। इसीलिए `harness-score` खुद 100% computational है — जिस maturity measurement को reproduce न कर सकें, वह measurement नहीं है।

## harness आपको क्या देता है: LangChain के lessons

LangChain की Terminal Bench climb harness engineering का सबसे अच्छा public case study है। जिन techniques ने needle हिलाया:

1. **Self-verification loops.** एजेंट को plan → implement → test → fix करना ज़रूरी है, victory declare करने से पहले; pre-completion checklist middleware verification pass के बिना "done" मानने से इनकार करता है। आपकी repo में समकक्ष यह है: tests जो एजेंट actually चला सके — और conventions जो उसे बताएँ कि चलाए।
2. **Context assembly एजेंट की ओर से.** उनका middleware session start पर working directory map करता है ताकि एजेंट explore करने में steps न गँवाए। Cursor में `AGENTS.md` और scoped rules यह काम करते हैं।
3. **Loop detection.** Middleware "doom loops" तोड़ता है जहाँ एजेंट वही failing edit बार-बार retry करता है। hooks आपको वही observation point देते हैं।
4. **Sandwich जैसा reasoning budget.** planning और final verification पर maximum thinking, बीच में moderate। Cursor के models पर आपका नियंत्रण नहीं, पर plan और verification *किसके against* check हो — यह आप नियंत्रित करते हैं: आपके rules और tests।

चारों harness properties हैं, model properties नहीं। चारों का Cursor repository में direct equivalent है — guide का बाकी हिस्सा इसी पर है।

## Harnessability: कुछ codebases harness करना आसान होते हैं

Fowler **ambient affordances** की बात करता है — environment की properties जो एजेंटों को अधिक governable बनाती हैं:

- **Typed languages** हर edit को free, instant sensor देती हैं (compiler)।
- **Clear module boundaries** प्रति task ज़रूरी context छोटा करती हैं।
- **Consistent conventions** guides को essays से bullet lists बना देती हैं।
- **Fast test suites** self-verification को इतना सस्ता बनाती हैं कि आदत बन जाए।

इसीलिए [maturity model](./maturity-model) type checking और test infrastructure को Cursor-specific artifacts के साथ score करता है: वे एक ही control system का हिस्सा हैं।

## यह guide आगे कहाँ जाती है

- अध्याय 2 पूरा [Cursor harness surface](./cursor-harness-surface) map करता है —
  Cursor जो भी file और mechanism देता है।
- अध्याय 3–5 तीन control families गहराई से:
  [Guides](./guides-feedforward), [Sensors](./sensors-feedback), और
  [Guardrails](./guardrails-and-safety)।
- अध्याय 6 [पाँच-स्तरीय maturity model](./maturity-model) परिभाषित करता है,
  objective maturity model के साथ।
- अध्याय 7 दिखाता है कैसे [measure और improve](./measure-and-improve)
  `harness-score` scanner और Cursor plugin से करें।
