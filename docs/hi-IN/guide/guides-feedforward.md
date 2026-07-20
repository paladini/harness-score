# Guides — Feedforward नियंत्रण

Guides एजेंट को कार्य करने से *पहले* आकार देते हैं — feedforward, यानी कार्य से पहले का मार्गदर्शन। ये सबसे सस्ते नियंत्रण हैं: सही जगह एक अनुच्छेद पूरे वर्ग की गलतियाँ रोक देता है। यह अध्याय बताता है कि उन्हें अच्छी तरह कैसे लिखें।

## संदर्भ की अर्थशास्त्र

हर guide एक ही दुर्लभ संसाधन के लिए प्रतिस्पर्धा करता है: मॉडल की context window और उसका ध्यान। उत्साही टीमों की विफलता अक्सर guides की कमी नहीं, **शब्दों की अधिकता** होती है — दो हज़ार पंक्तियों की rules file जिसे मॉडल सरसरी नज़र से पढ़ ले, wiki जो `AGENTS.md` में चिपका दी गई हो। LangChain का harness सबक यहाँ लागू होता है: *एजेंट की ओर से context जोड़ना* का मतलब सही 50 पंक्तियाँ देना है, सभी 5,000 नहीं।

व्यावहारिक बजट:

- `AGENTS.md`: ≤150 पंक्तियाँ, हमेशा लोड — केवल वही जो *हर* कार्य पर लागू हो।
- Always-on rules: एक या दो, प्रत्येक ≤30 पंक्तियाँ।
- Glob-scoped rules: जितनी चाहिए उतनी; प्रत्येक केवल प्रासंगिक होने पर लोड।
- Skills: लंबाई की सीमा नहीं; केवल माँग पर लोड।

## काम करने वाला AGENTS.md लिखना

जो संरचना सिद्ध हो चुकी है:

```markdown
# Agent Guide — <project>

## What this is
Two sentences. Domain, purpose, key constraint.

## Layout
- src/api — HTTP layer (see .cursor/rules/api.mdc)
- src/core — domain logic, pure functions only
- migrations/ — generated; never edit by hand

## Build & test
- npm run dev / npm test / npm run typecheck
- Tests MUST pass before any commit.

## Conventions
- TypeScript strict; no `any` without a comment.
- Never add dependencies without asking.

## Do not touch
- vendor/, generated/, legacy/payments (frozen for audit)
```

सिद्धांत:

1. **विवरण से आगे आदेश।** «`npm test` चलाएँ» — «हम परीक्षण को महत्व देते हैं» से बेहतर। एजेंट आदेशों पर कार्य करते हैं।
2. **इशारा करें, चिपकाएँ नहीं।** विवरण inline करने के बजाय scoped rule या skill से लिंक करें («`.cursor/rules/api.mdc` देखें»)।
3. **क्या न करें, बताएँ।** नकारात्मक स्थान — frozen directories, वर्जित patterns — सबसे महँगी गलतियाँ रोकते हैं।
4. **अद्यतन रखें।** पुराना guide किसी guide से भी बुरा; एजेंट उसे आत्मविश्वास से मानता है। `AGENTS.md` की समीक्षा आर्किटेक्चर बदलावों के लिए आपकी definition of done का हिस्सा होनी चाहिए।

## सही समय पर चलने वाली rules लिखना

Rule के तीन काम हैं: सही समय पर लागू होना, पढ़ने योग्य छोटी होना, और जाँच योग्य ठोस होना।

**Scope को सख्ती से लगाएँ।** rules का सबसे बड़ा anti-pattern है हर चीज़ पर `alwaysApply: true`। हर always-on rule हर अनुरोध पर लोड होती है — README में typo ठीक करने के अनुरोध सहित। Glob से scope करें:

```markdown
---
description: React component conventions
globs: src/components/**/*.tsx
---
```

**एक rule, एक विषय।** `api.mdc`, `testing.mdc`, `styling.mdc` — `everything.mdc` नहीं। छोटी rules diff करने, review करने और स्वतंत्र scope करने योग्य होती हैं।

**ठोस और जाँच योग्य।** «अच्छे tests लिखें» कुछ नहीं बताता। «`src/core` में हर नए export के लिए sibling `__tests__` folder में unit test चाहिए» — बताता है, और reviewer (या sensor) इसे verify कर सकता है।

**पहले दिखाएँ, फिर बताएँ।** सही pattern का 5-पंक्ति code example तीन अनुच्छेदों से बेहतर काम करता है।

## Skills: प्रक्रियात्मक परत

जो कुछ *runbook* जैसा लगे, वह rule में नहीं, skill में हो:

- Deploy और release प्रक्रियाएँ
- Database migration workflows
- «नया API endpoint end-to-end कैसे जोड़ें»
- Incident debugging playbooks

Skill की गुणवत्ता **description** पर निर्भर करती है — load करने का निर्णय लेते समय एजेंट केवल यही देखता है। तुलना करें:

```yaml
description: Deployment stuff            # never triggers
```

```yaml
description: Use when the user asks to deploy, release, or ship to
  production; covers tagging, the pipeline, rollback, and smoke tests.
```

Descriptions को trigger conditions के रूप में लिखें («Use when…»), ≥40 characters, वे शब्द बताते हुए जो user वास्तव में कहेगा।

## Commands: अपनी टीम की क्रियाएँ encode करें

Commands *मनुष्य और एजेंट दोनों* के लिए guides हैं: `/review`, `/release`, `/new-endpoint` — executable रूप में आपकी टीम कैसे काम करती है, यह दर्शाते हैं। अच्छा command prompt workflow, quality bar और stopping condition बताता है:

```markdown
# /review

Review the current diff against AGENTS.md and .cursor/rules/.
Report findings ordered by severity with file:line references.
Do not fix anything unless explicitly asked.
```

## Bootstrap scripts और templates

Fowler bootstrap tooling को feedforward नियंत्रणों में गिनता है: generators और templates जो एजेंट को ज्ञात-अच्छे skeleton से शुरू करते हैं (`npm run new:endpoint`, observability wired-in service template)। जब pattern बिल्कुल वैसा ही दोहराना हो, generator pattern के description से बेहतर — फिर से determinism। ऐसे scripts `AGENTS.md` में उल्लेख करें ताकि एजेंट hand-rolling के बजाय उन्हें इस्तेमाल करें।

## Guides कैसे विफल होते हैं, और क्या पकड़ता है

| विफलता | लक्षण | प्रतिकार |
|---|---|---|
| Stale guide | एजेंट पुरानी convention follow करता है | architecture छूने वाले PR में harness files review करें |
| Bloated context | एजेंट file के बीच के निर्देश ignore करता है | rules scope करें; procedures skills में ले जाएँ |
| Vague guidance | एजेंट creatively interpret करता है | rules को ठोस और जाँच योग्य बनाएँ |
| Guide ignored | वही गलती बार-बार | sensor या hook पर escalate करें (अध्याय 4–5) |

अंतिम पंक्ति अगले अध्याय का पुल है: guides सुझाव हैं, और कुछ सुझाव **checks** बनने चाहिए।
