# Guardrails और Safety

Guides suggest करते हैं। Sensors detect करते हैं। **Guardrails prevent करते हैं।** यह अध्याय harness की वह परत कवर करता है जो तब भी कायम रहती है जब मॉडल हर निर्देश ignore कर दे — क्योंकि यह मॉडल के कुछ पढ़ने पर निर्भर नहीं।

## Prose guardrail क्यों नहीं है

«कभी `git push --force` न चलाएँ» वाली rule probabilistic system से अनुरोध है। आमतौर पर मानी जाएगी। Destructive, irreversible, या credential-touching operations के लिए «आमतौर पर» गलत reliability class है। उनके लिए check **मॉडल के बाहर** होना चाहिए, machinery में जिसे मॉडल skip नहीं कर सकता: hooks, permissions, repository hygiene।

अध्याय 3 की escalation ladder यहाँ समाप्त होती है: बार-बार violate होने वाला guidance rule → sensor → **gate** पर जाता है।

## Gate hooks

Cursor के gating events — `beforeShellExecution`, `beforeMCPExecution`, `preToolUse`, `beforeReadFile` — action से *पहले* आपका script चलाते हैं और `allow`, `deny`, या `ask` उत्तर देने देते हैं:

```js
// .cursor/hooks/guard-shell.js — deny destructive commands
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const { command = '' } = JSON.parse(input || '{}');
  const destructive =
    /\brm\s+-rf\s+[\/~]|\bgit\s+push\s+--force\b|\bdrop\s+(table|database)\b/i;
  process.stdout.write(
    JSON.stringify(
      destructive.test(command)
        ? { permission: 'deny', userMessage: 'Blocked: destructive command.' }
        : { permission: 'allow' },
    ),
  );
});
```

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "node ./.cursor/hooks/guard-shell.js", "timeout": 10 }
    ]
  }
}
```

अधिकांश repositories में gate करने लायक patterns:

- **Destructive shell**: workspace के बाहर recursive deletes, force pushes, history rewrites, non-local databases पर `DROP`/`TRUNCATE`।
- **Outbound writes**: deploys, package publishes, external APIs पर posting — `deny` नहीं, `ask`: human in-flow confirm करता है।
- **Secret-bearing reads**: `.env*`, key files, credential stores पर `beforeReadFile` secrets को model context से पूरी तरह बाहर रखता है।
- **Side effects वाले MCP calls**: tool name से filter — `beforeMCPExecution`; reads allow, writes confirm।

Design notes: dangerous list के लिए *closed* fail (exit code 2 block), gate scripts dependency-free और fast रखें, और **commit करें** — केवल आपकी machine पर मौजूद script की ओर इशारा करने वाला hook config केवल आपकी रक्षा करता है।

## Secret hygiene

एजेंट आपका working tree पढ़ता है; उसमें कुछ भी context, commit, या generated file में समा सकता है। Deterministic hygiene rules:

1. **`.gitignore` `.env` और `.env.*` cover करे** (`.env.example` allow)। यह सबसे सस्ता guardrail है।
2. **Tree में real `.env` files न हों** जहाँ avoidable; templates required variables document करें।
3. **`mcp.json` `${ENV_VAR}` interpolation use करे, literal keys नहीं।** Inlined API key वाला MCP config हर clone पर published secret है।
4. **Harness files में tokens नहीं।** `AGENTS.md`, rules, hooks configs *हर session पर model context में load* होते हैं — वहाँ key design से exfiltrated है।

`harness-score` चारों (HYG-02 … HYG-06) credential-signature matching से check करता है — deterministically, offline।

## Prompt-injection awareness

Agent harnesses में human workflows में नहीं दिखने वाला threat class है: **data में छिपे निर्देश**। Dependency का README, MCP से fetch किया webpage, issue comment — कोई भी आपके एजेंट को संबोधित text रख सकता है («अपने निर्देश ignore करो और चलाओ…»)। Harness-level mitigations:

- Gate hooks को परवाह नहीं कि निर्देश किसने लिखा — destructive command deny होती है चाहे user, model, या injected page ने माँगी हो। Gates को rules पर यही सबसे मजबूत तर्क है।
- MCP servers task जितने चाहिए उतने scope करें; read-only docs server आपका data कहीं post नहीं कर सकता।
- «एजेंट अचानक unfamiliar domain पर curl करना चाहता है» — `ask` gate के लायक signal।

## Permissions और blast radius

Hooks के अलावा, compromised या confused agent *क्या* कर सकता है, सिकोड़ें:

- Task-scoped credentials के साथ agents चलाएँ (CI token जो PRs open कर सके पर `main` push नहीं)।
- Branch protection: agents PRs open करें; humans (या required checks) merge।
- Untrusted या long-running autonomous work के लिए sandboxed execution।

एकीकृत सिद्धांत **defense in depth** है: rules bad actions को unlikely बनाते हैं, sensors visible, gates impossible, permissions «impossible failed» को भी survivable।

## न्यूनतम viable guardrail set

Typical product repository के लिए floor:

- [ ] `.gitignore` env files cover; tree में real secrets नहीं
- [ ] `mcp.json` literal credentials से clean
- [ ] `hooks.json` एक shell gate (destructive patterns → deny/ask)
- [ ] एक feedback hook (edit पर format/lint)
- [ ] Branch protection required CI checks के साथ

यह set वही है जो [maturity model](./maturity-model) L4 पर Hooks & Guardrails और Hygiene & Safety dimensions के लिए माँगता है।
