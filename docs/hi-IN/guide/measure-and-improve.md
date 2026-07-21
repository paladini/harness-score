# मापन और सुधार

इस गाइड का सार एक कमांड में समेटा गया है:

```bash
npx harness-score
```

स्कैनर आपके रिपॉज़िटरी को पार करता है (केवल फ़ाइलसिस्टम — बिना LLM, बिना नेटवर्क, बिना टेलीमेट्री), किसी भी AI टूल पर 36 निश्चित checks चलाता है, और अगले स्तर तक की सटीक कमियों के साथ परिपक्वता स्तर रिपोर्ट करता है:

```
  harness-score v1.0.0  /work/my-app

  Maturity: L2 · Guided   Score: 66/108 (61%)
  Detected: Cursor, Claude Code

  Context & Guides     ████████████████░░░░  80%
  Skills & Commands    █████████████░░░░░░░  67%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  ...

  To reach L3: sensors ≥ 60%; ci ≥ 50%
```

> **मल्टी-टूल:** स्कैनर Cursor, Claude Code, Windsurf, Cline, Continue और अन्य टूल के harness artifacts को OR semantics से पहचानता है — यदि आप कोई एक टूल कॉन्फ़िगर करते हैं, तो Harness Score उसे गिनता है। अधिक जानकारी: [मल्टी-harness सपोर्ट](./multi-harness)।

## इंस्टॉल करना

```bash
npx harness-score                                       # no install
npm install -g harness-score                            # global binary
npm install --save-dev harness-score                    # pinned devDependency
```

[GitHub Packages](https://github.com/paladini/harness-score/pkgs/npm/harness-score)
(`@paladini/harness-score`) और [JSR](https://jsr.io/@paladini/harness-score) पर भी
Deno/Bun प्रोजेक्ट के लिए उपलब्ध है।

## लाइब्रेरी के रूप में उपयोग

CLI पूर्ण-टाइप्ड प्रोग्रामेटिक API के चारों ओर एक पतला wrapper है — कस्टम डैशबोर्ड, बॉट, या किसी भी टूल के लिए उपयोगी जो टर्मिनल आउटपुट पार्स करने के बजाय कच्चा `Report` चाहता है:

```ts
import { score } from 'harness-score';

const report = score('/path/to/repo');
console.log(report.level.name, report.score.percent, report.dimensions);
// With global scopes: score(path, { scopeFlags: ['user'] })
console.log(report.effective.level.index);
```

`Report`, `Check`, `CheckResult`, `DimensionScore`, `LevelInfo`, `ScoreSnapshot` और हर अन्य shape TypeScript declarations के रूप में शिप होते हैं — स्पष्ट `"types"` फ़ील्ड के ज़रिए resolve होते हैं, इसलिए एडिटर और `tsc` बिना अतिरिक्त कॉन्फ़िगरेशन के उन्हें पहचान लेते हैं। निचले-स्तर के building blocks भी export हैं, जो `score()` सीधे कवर नहीं करता:

```ts
import { score, computeDiff, renderMarkdown } from 'harness-score';

const report = score('/path/to/repo');
const markdown = renderMarkdown(report);          // same renderer the CLI's --md uses
```

## स्कैन कॉन्फ़िगरेशन {#scan-configuration}

डिफ़ॉल्ट रूप से स्कैनर **केवल repository maturity** मापता है — वह harness
जो code के साथ यात्रा करता है और CI में reproduce होता है। वैकल्पिक रूप से
user-level या shared harness trees शामिल करें **effective** score के लिए (developer
laptop पर agent को संभावित रूप से क्या दिखता है)।

```json
{
  "scopes": { "user": false, "system": false },
  "extraRoots": [{ "id": "team-shared", "path": "../shared-harness" }],
  "gate": "maturity"
}
```

`.harness-score.json` को scan root पर सहेजें, या `--config <file>` पास करें।
पूर्ण key reference: [Metrics & Codes — configuration](./metrics-and-codes#configuration-file-harness-scorejson).

```bash
harness-score --scope user              # repo + ~/.cursor, ~/.claude, …
harness-score --scope user,system
harness-score --gate effective --min-level 2   # gate on effective score
```

Terminal report **Maturity** (repo) और **Effective** (जब अलग हों) दिखाता है।
CI में `gate: maturity` रखें जब तक आप जानबूझकर self-hosted runners पर populated user harness के साथ न चलाएँ।

## CLI संदर्भ

```bash
harness-score [path]              # human report (default: current directory)
harness-score --json              # full report as JSON
harness-score --md report.md      # markdown report (use "-" for stdout)
harness-score --badge badge.svg   # SVG pill: harness + detected level (L0–L4)
harness-score --min-level 3       # exit 1 if below L3 — the CI gate (uses gate mode)
harness-score --diff base.json    # compare maturity against a previous --json report
harness-score --config .harness-score.json
harness-score --scope user        # include user-level harness in effective score
harness-score --gate maturity     # or effective — which score --min-level uses
```

### समय के साथ स्कोर ट्रैक करना {#diff-mode}

`--diff <file>` वर्तमान स्कैन की तुलना पहले `--json` रन से सहेजी गई baseline रिपोर्ट से करता है — स्तर और स्कोर के deltas, प्रति-आयाम गति, और ठीक-ठीक कौन-से checks बदले:

```bash
harness-score --json > baseline.json   # save today's report
# ...later, after changes...
harness-score --diff baseline.json     # see what moved
```

```
  Compared to baseline:
    Level: L2 · Guided → L3 · Sensing (+1)
    Score: 61/108 (56%) → 84/108 (78%) (+22pp)
    Sensors & Feedback   20% → 90% (+70pp)
    Newly passing: SNS-01, SNS-02, SNS-04, CI-01, CI-02
```

`--diff` `--json` (payload में `current`/`baseline`/`diff` जोड़ता है) और `--md` («Compared to baseline» सेक्शन जोड़ता है) दोनों के साथ काम करता है — GitHub Action PR पर «harness score L2 से L3 हो गया» जैसी टिप्पणियाँ पोस्ट करने के लिए इसी का उपयोग करता है।

## Cursor प्लगइन {#the-cursor-plugin}

[इस रिपॉ repo के प्लगइन डायरेक्टरी](https://github.com/paladini/harness-score/tree/main/plugins/cursor) से **Harness Score** इंस्टॉल करें
(Cursor Marketplace लिस्टिंग जमा है और समीक्षा लंबित है — लाइव होने पर यह लिंक वहाँ चला जाएगा) और आपको मिलेगा:

- **`/harness-audit`** — खुले workspace पर स्कैनर चलाता है और एजेंट से रिपोर्ट उसकी शीर्ष remediations के साथ प्रस्तुत करवाता है।
- **`harness-engineering` skill** — जब आप «ठीक करो» या «मेरा harness सुधारो» कहते हैं, तो एजेंट जानता है कि इस गाइड की recipes के अनुसार missing artifacts कैसे लिखने हैं।

विश्लेषण हमेशा deterministic CLI ही है; मॉडल केवल परिणाम दिखाता है और आपके कहे अनुसार सुधार लागू करता है।

## CI गेट {#ci-gate}

Harness चुपचाप पीछे हट जाता है — किसी ने सफ़ाई में `hooks.json` हटा दिया, rules फ़ाइल सड़ गई। CI में अपना स्तर केवल ऊपर की ओर रखें:

```yaml
- name: Harness gate
  run: npx -y harness-score --min-level 3
```

या packaged action का उपयोग करें, जो बैज भी emit करता है:

```yaml
- uses: paladini/harness-score/action@main
  with:
    min-level: '3'
    badge: 'harness-badge.svg'
```

## अपनी परिपक्वता दिखाएँ {#show-your-maturity}

Harness Score **दो ब्रांडेड SVG फ़ॉर्मेट** शिप करता है, स्कैनर की progress bars के समान visual language में — कोई shields.io नहीं, कोई paid service नहीं, render समय पर नेटवर्क नहीं:

| फ़ॉर्मेट | फ़ाइलें | दिखाता है | सबसे अच्छा |
|---|---|---|---|
| **बैज** | `harness-badge.svg` या `badge-l0.svg` … `badge-l4.svg` | `harness` · `L4` | README पंक्ति (112×20 कैप्सूल बैज) |
| **शेयर कार्ड** | `card-l0.svg` … `card-l4.svg` | स्तर नाम के साथ पूर्ण बैनर | सोशल पोस्ट, repo hero (860×240) |

बैज हमेशा **केवल स्तर** (`L0`–`L4`) दिखाता है। स्तर नाम
(Unharnessed, Guided, …) शेयर कार्ड और स्कैनर आउटपुट में होते हैं।

कैप्सूल बैज एक जैसा दिखता है चाहे CI उसे दोबारा generate करे या आप static फ़ाइल pin करें —
केवल wiring अलग है।

### बैज — स्व-अपडेट (अनुशंसित)

`harness-score --badge` स्कैनर द्वारा detect किए गए स्तर के लिए SVG लिखता है।
CI में एक बार wire करें; README की छवि आपके harness के सुधरने पर खुद अपडेट होती रहती है।

```yaml
# .github/workflows/harness.yml
name: Harness Score
on: { push: { branches: [main] } }
permissions: { contents: write }
jobs:
  harness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/harness-score/action@main
        with: { badge: 'harness-badge.svg' }
      - uses: JamesIves/github-pages-deploy-action@v4
        with: { branch: badges, folder: ., clean: false }
```

README में published फ़ाइल reference करें — पूर्ण copy-paste recipes
[Embed snippets](#embed-snippets) में:

```md
<img alt="Harness Score" src="https://raw.githubusercontent.com/<you>/<repo>/badges/harness-badge.svg" height="20">
```

`<img>` पर `height="20"` सेट करें ताकि कैप्सूल बैज उसी पंक्ति में npm/CI shields के साथ align हो
(112×20 SVG; केवल स्तर — स्कोर प्रतिशत CLI रिपोर्ट में रहता है)।

Dogfood उदाहरण (इस गाइड का GitHub Pages पर live बैज):

<div class="hs-visual">
  <p class="hs-visual-label">Badge (this repo)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" src="/harness-badge.svg" alt="Harness Score" height="20">
  </div>
</div>

detect किए गए स्तर का matching शेयर कार्ड
`harness-card.svg` के रूप में publish होता है (वर्तमान में इस रिपॉ के लिए L4):

<img class="hs-share-card" src="/harness-card.svg" alt="Harness Score L4 · Self-correcting">

### बैज — स्तर pin करें

वही कैप्सूल बैज, static फ़ाइल — यदि आप CI से छवि regenerate नहीं चाहते, तो `badge-l0.svg` … `badge-l4.svg` चुनें। Markdown, HTML, iframe, JSX और अन्य के लिए [Embed snippets](#embed-snippets) देखें।

### शेयर कार्ड

hero छवि या सोशल पोस्ट के लिए, बैनर शेयर कार्ड का उपयोग करें — इसमें स्तर नाम
(`Unharnessed`, `Guided`, …) शामिल है:

| Level | Badge | Share card |
|---|---|---|
| L0 · Unharnessed | [badge-l0.svg](https://paladini.github.io/harness-score/maturity/badge-l0.svg) | [card-l0.svg](https://paladini.github.io/harness-score/maturity/card-l0.svg) |
| L1 · Documented | [badge-l1.svg](https://paladini.github.io/harness-score/maturity/badge-l1.svg) | [card-l1.svg](https://paladini.github.io/harness-score/maturity/card-l1.svg) |
| L2 · Guided | [badge-l2.svg](https://paladini.github.io/harness-score/maturity/badge-l2.svg) | [card-l2.svg](https://paladini.github.io/harness-score/maturity/card-l2.svg) |
| L3 · Sensing | [badge-l3.svg](https://paladini.github.io/harness-score/maturity/badge-l3.svg) | [card-l3.svg](https://paladini.github.io/harness-score/maturity/card-l3.svg) |
| L4 · Self-correcting | [badge-l4.svg](https://paladini.github.io/harness-score/maturity/badge-l4.svg) | [card-l4.svg](https://paladini.github.io/harness-score/maturity/card-l4.svg) |

<div class="hs-visual">
  <p class="hs-visual-label">All badge levels (112×20)</p>
  <div class="hs-badge-row">
    <img class="hs-badge" alt="L0" src="/maturity/badge-l0.svg" height="20">
    <img class="hs-badge" alt="L1" src="/maturity/badge-l1.svg" height="20">
    <img class="hs-badge" alt="L2" src="/maturity/badge-l2.svg" height="20">
    <img class="hs-badge" alt="L3" src="/maturity/badge-l3.svg" height="20">
    <img class="hs-badge" alt="L4" src="/maturity/badge-l4.svg" height="20">
  </div>
</div>

<div class="hs-visual">
  <p class="hs-visual-label">Share card example (860×240)</p>
  <img class="hs-share-card" alt="L4 · Self-correcting" src="/maturity/card-l4.svg">
  <p class="hs-visual-detail">ऊपर की तालिका से कोई भी स्तर डाउनलोड करें — शेयर कार्ड में स्तर नाम शामिल होता है।</p>
</div>

## Embed snippets {#embed-snippets}

शेयर करने के लिए copy-paste recipes। placeholders बदलें:

| Placeholder | स्व-अपडेट बैज | pin किया बैज (स्तर `{N}`) | शेयर कार्ड |
|---|---|---|---|
| `{BADGE_URL}` | `https://raw.githubusercontent.com/{owner}/{repo}/badges/harness-badge.svg` | `https://paladini.github.io/harness-score/maturity/badge-l{N}.svg` | — |
| `{CARD_URL}` | — | — | `https://paladini.github.io/harness-score/maturity/card-l{N}.svg` |
| `{LINK}` | आपका repo या `https://paladini.github.io/harness-score/` | वही | वही |

`{N}` `0`–`4` है। इस रिपॉ का live बैज (आपके fork पर CI की ज़रूरत नहीं):
`https://raw.githubusercontent.com/paladini/harness-score/main/docs/public/harness-badge.svg`

**बैज आकार:** 112×20 — हमेशा `height="20"` (या `height={20}`) सेट करें ताकि कैप्सूल बैज shields.io बैज के साथ align हो।

### बैज — Markdown

केवल छवि (GitHub, GitLab, dev.to — यदि plain `![]()` stretch करता है तो HTML उपयोग करें):

```md
<img alt="Harness Score L4" src="{BADGE_URL}" height="20">
```

लिंक्ड (क्लिक योग्य):

```md
[![Harness Score L4]({BADGE_URL})]({LINK})
```

Reference-style:

```md
[![Harness Score][hs-badge]][hs-link]

[hs-badge]: {BADGE_URL}
[hs-link]: {LINK}
```

### बैज — HTML

```html
<img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
```

लिंक्ड:

```html
<a href="{LINK}">
  <img alt="Harness Score L4" src="{BADGE_URL}" height="20" width="112">
</a>
```

### बैज — iframe

CMS या wiki जो केवल iframe अनुमति देते हैं (`<img>` नहीं):

```html
<iframe
  src="{BADGE_URL}"
  title="Harness Score L4"
  width="112"
  height="20"
  style="border:0;overflow:hidden"
></iframe>
```

### बैज — SVG object / embed

```html
<object data="{BADGE_URL}" type="image/svg+xml" width="112" height="20">
  <a href="{BADGE_URL}">Harness Score L4</a>
</object>
```

```html
<embed src="{BADGE_URL}" type="image/svg+xml" width="112" height="20" />
```

### बैज — JSX / React

```jsx
<a href="{LINK}">
  <img
    alt="Harness Score L4"
    src="{BADGE_URL}"
    height={20}
    width={112}
    style={{ verticalAlign: 'middle' }}
  />
</a>
```

### बैज — AsciiDoc

```asciidoc
image:{BADGE_URL}[Harness Score L4,link={LINK},height=20]
```

### बैज — BBCode (forums)

```text
[url={LINK}][img]{BADGE_URL}[/img][/url]
```

### बैज — direct URL

chat, Notion image block, Slack, Discord, या किसी भी टूल में paste करें जो
raw image URL स्वीकार करता है:

```text
{BADGE_URL}
```

### शेयर कार्ड — Markdown / HTML

README hero, blog posts, या social previews के लिए बैनर (`{N}` = `0`–`4`):

```md
[![Harness Score L4 · Self-correcting]({CARD_URL})]({LINK})
```

```html
<a href="{LINK}">
  <img
    alt="Harness Score L4 · Self-correcting"
    src="{CARD_URL}"
    width="560"
    style="max-width:100%;height:auto;border-radius:8px"
  />
</a>
```

### शेयर कार्ड — iframe

```html
<iframe
  src="{CARD_URL}"
  title="Harness Score L4 · Self-correcting"
  width="560"
  height="157"
  style="border:0;max-width:100%"
></iframe>
```

### शेयर कार्ड — direct URL

```text
{CARD_URL}
```

### Worked example (pinned L3 badge)

```md
<a href="https://paladini.github.io/harness-score/">
  <img alt="Harness Score L3" src="https://paladini.github.io/harness-score/maturity/badge-l3.svg" height="20">
</a>
```

```html
<iframe
  src="https://paladini.github.io/harness-score/maturity/badge-l3.svg"
  title="Harness Score L3"
  width="112"
  height="20"
  style="border:0"
></iframe>
```

> **shields.io पसंद है?** आपका Action एक छोटी JSON फ़ाइल भी लिख सकता है और
> [shields endpoint](https://shields.io/badges/endpoint-badge) की ओर point कर सकता है
> (`{ "schemaVersion": 1, "label": "harness", "message": "L3", "color": "brightgreen" }`)।
> ऊपर के brand SVG self-contained हैं और किसी third party की ज़रूरत नहीं।

## check कैटलॉग {#the-check-catalog}

स्कैनर जो checks चलाता है, उनकी remediation recipe के साथ। check IDs स्थिर हैं; CLI प्रत्येक failure को यहाँ के entry से लिंक करता है।

### Context & Guides (20 pts)

#### CTX-01 · Agent context file present — 4 pts {#ctx-01}
रिपॉज़िटरी रूट पर `AGENTS.md` (या `CLAUDE.md` / `GEMINI.md`) मौजूद है।
**सुधार:** `AGENTS.md` बनाएँ जो इनका उत्तर दे: यह प्रोजेक्ट क्या है, build और test कैसे करें, कौन-सी conventions लागू हैं, क्या कभी न छुएँ। recipe
[अध्याय 3](./guides-feedforward#writing-an-agents-md-that-works) में।

#### CTX-02 · Context file is substantive — 3 pts {#ctx-02}
≥20 meaningful lines और ≥2 headings — stub को अंक नहीं मिलते।
**सुधार:** layout, build और test commands, conventions, और वर्जित क्षेत्र कवर करें।
विवरण से commands; rules paste करने के बजाय उनकी ओर point करें।

#### CTX-03 · Scoped rules in use — 4 pts {#ctx-03}
किसी भी supported tool के लिए कम से कम एक scoped rule फ़ाइल (जैसे `.cursor/rules/*.mdc`,
`.windsurf/rules/*.md`, `.clinerules/*.md`, `.continue/rules/*.md`,
`.github/instructions/*.instructions.md`, `.agents/rules/*`)। subdirectories में nested context
फ़ाइलें (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` root के नीचे कहीं भी) भी गिनती हैं — Claude
Code और Codex जैसे टूल में ये directory-scoped rules हैं।
**सुधार:** एक छोटी always-on rule से शुरू करें जिसमें अपरिहार्य नियम हों,
फिर प्रति area path-scoped rules (या प्रति subtree nested context फ़ाइलें) जोड़ें।

#### CTX-04 · Rules have valid frontmatter — 3 pts {#ctx-04}
हर rule activation metadata declare करती है (`description`, `globs`/`trigger`/`paths`/`applyTo`, या `alwaysApply`)।
टूल जो metadata के बिना auto-load करते हैं — `.continue/rules/*` और nested
context फ़ाइलें — construction से pass होती हैं।
**सुधार:** frontmatter block जोड़ें; इसके बिना एजेंट decide नहीं कर सकता कि rule
कब लागू हो।

#### CTX-05 · Rules are scoped — 2 pts {#ctx-05}
हर rule blanket always-on नहीं है। nested context फ़ाइलें scoped गिनती हैं —
वे केवल अपने subtree पर लागू होती हैं।
**सुधार:** rules को paths (`globs:`, `trigger:` glob, `paths:`, `applyTo:`) तक सीमित करें
ताकि relevant होने पर ही load हों — हर always-on rule हर request के context पर tax लगाती है।

#### CTX-06 · No bloated rules — 2 pts {#ctx-06}
कोई single rule 500 lines से अधिक नहीं।
**सुधार:** concern के अनुसार split करें, या procedural content को skill में ले जाएँ।

#### CTX-07 · README present — 1 pt {#ctx-07}
**सुधार:** README.md जोड़ें; यह humans के लिए पहला orientation document है और
agents के लिए fallback।

#### CTX-08 · No legacy .cursorrules — 1 pt {#ctx-08}
deprecated single-file फ़ॉर्मेट absent है (या modern scoped rules भी मौजूद हैं)।
**सुधार:** `.cursorrules` content को अपने टूल की scoped rules में migrate करें।

### Skills & Commands (17 pts)

#### SKL-01 · At least one skill — 4 pts {#skl-01}
`.cursor/skills/<name>/`, `.claude/skills/<name>/`, या `.agents/skills/<name>/` के अंतर्गत `SKILL.md`।
**सुधार:** अपनी सबसे बार-बार दोहराई procedure (deploy, release, migration)
को skill के रूप में package करें — [अध्याय 3](./guides-feedforward#skills-the-procedural-layer)।

#### SKL-02 · Skills declare name and description — 3 pts {#skl-02}
हर skill पर frontmatter में `name:` और `description:`।
**सुधार:** एजेंट केवल इन दो fields से decide करता है कि skill load करनी है या नहीं;
इनके बिना skill invisible है।

#### SKL-03 · Explicit workflows/commands defined — 3 pts {#skl-03}
Command या workflow फ़ाइलें (`.cursor/commands/`, `.windsurf/workflows/`,
`.claude/commands/`, `.continue/prompts/`, `.zed/commands/`, `.agents/workflows/`)।
**सुधार:** workflows जिन्हें आप जानबूझकर trigger करते हैं (`/review`, `/release`)
को command/workflow फ़ाइलों के रूप में encode करें।

#### SKL-04 · Skill descriptions are trigger-worthy — 2 pts {#skl-04}
Descriptions ≥40 characters।
**सुधार:** descriptions को trigger conditions के रूप में लिखें — «Use when the user asks
to deploy or release; covers tagging, pipeline, rollback, smoke tests.»

#### AGT-01 · Custom subagent defined — 3 pts {#agt-01}
`.cursor/agents/`, `.claude/agents/`, या `.opencode/agents/` के अंतर्गत subagent फ़ाइल।
**सुधार:** primary agent को delegate करने वाले काम (planning, review, release) के लिए purpose-built subagent package करें — देखें
[Subagents](./cursor-harness-surface#subagents-purpose-built-delegates)
अध्याय 2 में।

#### AGT-02 · Subagents declare name and description — 2 pts {#agt-02}
हर subagent definition पर frontmatter में `name:` और `description:`।
**सुधार:** parent agent केवल इन दो fields से decide करता है कि delegate करना है या नहीं;
इनके बिना subagent कभी invoke नहीं होता।

### Hooks & Guardrails (14 pts)

#### HKS-01 · Hooks configuration present and valid — 4 pts {#hks-01}
`.cursor/hooks.json` या `.claude/settings.json` (`hooks` key) मौजूद है और JSON के रूप में parse होता है।
**सुधार:** hooks config बनाएँ और
[अध्याय 5](./guardrails-and-safety#gate-hooks) की recipes से बढ़ाएँ।

#### HKS-02 · Known events, version declared — 2 pts {#hks-02}
Version/metadata मौजूद; हर registered event आपके टूल के लिए documented
(Cursor lifecycle events, या Claude Code `PreToolUse`/`PostToolUse`)।
**सुधार:** typo वाले event names silently fail —
[अध्याय 2](./cursor-harness-surface#hooks-observe-and-control-the-agent-loop) की event list से जाँचें।

#### HKS-03 · Gate hook guards risky operations — 4 pts {#hks-03}
gate hook registered (Cursor: `beforeShellExecution`, `beforeMCPExecution`,
`preToolUse`, या `beforeReadFile`; Claude Code: `PreToolUse`)।
**सुधार:** अध्याय 5 का destructive-command deny gate जोड़ें — prose rules
अनुरोध हैं; gates तथ्य हैं।

#### HKS-04 · Feedback hook observes output — 2 pts {#hks-04}
feedback hook registered (Cursor: `afterFileEdit`, `postToolUse`, …;
Claude Code: `PostToolUse`)।
**सुधार:** edit पर format-and-lint एजेंट को session के अंदर instant feedback देता है।

#### HKS-05 · Hook scripts committed — 2 pts {#hks-05}
hooks config द्वारा reference किए गए scripts रिपॉ में मौजूद हैं।
**सुधार:** उन्हें commit करें; missing script की ओर point करने वाला hook author की
machine के अलावा हर machine पर खुला विफल होता है।

### Sensors & Feedback (20 pts)

#### SNS-01 · Test runner configured — 6 pts {#sns-01}
वास्तविक test script/config (vitest, jest, pytest, go test, cargo test…)।
**सुधार:** runner wire करें एक obvious entry point के साथ और AGENTS.md में document करें —
tests वह तरीका हैं जिससे एजेंट अपना काम verify करता है।

#### SNS-02 · Linter configured — 5 pts {#sns-02}
eslint/biome, ruff, golangci-lint, rubocop, या equivalent।
**सुधार:** हर convention जो lint rule के रूप में express हो सकती है, prose की ज़रूरत नहीं रहती।

#### SNS-03 · Type checking in place — 4 pts {#sns-03}
tsconfig (आदर्श रूप से `strict: true`), mypy/pyright, या statically typed
language।
**सुधार:** type checker वह एकमात्र sensor है जो हर agent edit की
मुफ़्त review करता है — [अध्याय 4](./sensors-feedback#type-checking-the-free-sensor)।

#### SNS-04 · Formatter configured — 3 pts {#sns-04}
prettier/biome, black/ruff-format, gofmt/rustfmt।
**सुधार:** diffs में formatting noise review में real mistakes छिपा देता है।

#### SNS-05 · Test files exist — 2 pts {#sns-05}
tree में कम से कम एक वास्तविक test फ़ाइल।
**सुधार:** configured runner के साथ zero tests वह green light है जिसे किसी ने earn नहीं किया।

### CI Feedback (14 pts)

#### CI-01 · CI pipeline configured — 4 pts {#ci-01}
GitHub Actions workflow (या GitLab/CircleCI/Jenkins equivalent)।
**सुधार:** `.github/workflows/ci.yml` जोड़ें जो हर push पर sensors चलाए।

#### CI-02 · CI runs the tests — 4 pts {#ci-02}
**सुधार:** कोई agent-authored change merge योग्य नहीं होना चाहिए बिना suite
fire किए।

#### CI-03 · CI runs lint/typecheck — 3 pts {#ci-03}
**सुधार:** सस्ते computational sensors हर push पर belong — **गुणवत्ता को बाएँ रखें**।

#### CI-04 · Pre-commit checks installed — 3 pts {#ci-04}
husky/lint-staged, `pre-commit`, या lefthook।
**सुधार:** commit को मिलने वाला earliest feedback; on-edit hooks
द्वारा miss हुआ कुछ history में जाने से पहले पकड़ता है।

### Hygiene & Safety (23 pts)

#### HYG-01 · .gitignore present — 2 pts {#hyg-01}
**सुधार:** agents जो देखते हैं वह commit करते हैं; build output और local state
invisible बनाएँ।

#### HYG-02 · .gitignore covers env files — 3 pts {#hyg-02}
.gitignore में `.env` pattern।
**सुधार:** `.env` और `.env.*` जोड़ें (`!.env.example` allow करें) — सबसे सस्ता
guardrail।

#### HYG-03 · No unprotected .env files — 4 pts {#hyg-03}
tree में real env फ़ाइलें नहीं जब तक gitignored न हों (templates ठीक हैं)।
**सुधार:** secrets बाहर ले जाएँ; `.env.example` रखें required
variables document करने के लिए।

#### HYG-04 · MCP config free of credentials — 4 pts {#hyg-04}
MCP config (`.cursor/mcp.json`, `.mcp.json`,
`.agents/mcp_config.json`) में credential signatures नहीं।
**सुधार:** `${ENV_VAR}` interpolation उपयोग करें — MCP config में inlined key
हर clone को publish किया secret है।

#### HYG-05 · License present — 2 pts {#hyg-05}
**सुधार:** LICENSE जोड़ें; open-source use और plugin marketplaces के लिए आवश्यक।

#### HYG-06 · No secrets in harness files — 2 pts {#hyg-06}
AGENTS.md, rules, और hooks config token signatures से clean हैं।
**सुधार:** ये फ़ाइलें हर session में model context में load होती हैं — वहाँ key
design से exfiltrate होती है।

#### HYG-07 · Lockfile committed — 3 pts {#hyg-07}
package-lock.json, uv.lock, Cargo.lock, go.sum, या equivalent।
**सुधार:** reproducible installs का मतलब sensors हर जगह same dependency
tree test करते हैं।

#### HYG-08 · MCP config uses env interpolation for credentials — 3 pts {#hyg-08}
MCP config फ़ाइल valid है, और credential-shaped field (token, key,
secret, password…) literal के बजाय `${ENV_VAR}` interpolation उपयोग करता है।
HYG-04 का positive complement — MCP setup न होने वाले repo को यहाँ अंक नहीं,
जैसे कोई अन्य bonus check।
**सुधार:** secrets को `"${VAR_NAME}"` के रूप में reference करें और `.env.example` में required
variables document करें।

## एक worked improvement plan

typical L0 product repo से शुरू, प्रति स्तर एक focused session:

1. **→ L1 (एक दोपहर)।** `AGENTS.md` लिखें (CTX-01/02)। build/test
   commands शामिल करें भले sensors weak हों — एजेंट उन्हें उपयोग करेगा।
2. **→ L2 (एक दिन)।** तीन scoped rules + एक skill आपकी सबसे बार-बार procedure के लिए
   (CTX-03…06, SKL-01/02)। hygiene ठीक करें: gitignore, env files,
   license (HYG-01…05)।
3. **→ L3 (असली काम, यदि sensors missing हैं)।** test runner + linter +
   strict types + तीनों चलाने वाला `ci.yml` (SNS-*, CI-01…03)। यदि पहले से
   हैं, यह स्तर free है।
4. **→ L4 (एक सुबह)।** अध्याय 5 के दो hooks — एक gate, एक
   formatter — scripts के साथ commit (HKS-*), pre-commit (CI-04),
   फिर CI में `--min-level 4` ताकि कभी regress न हो।
