# Guardrails 与安全

指南建议。传感器检测。**Guardrails 阻止。** 本章是即使模型忽略每条指令仍 hold 的 harness 层 — 因它不依赖模型读任何东西。

## 为何 prose 不是 guardrail

说「永不 run `git push --force`」的 rule 是对 probabilistic 系统的请求。通常会被 honor。「通常」对破坏性、不可逆或 touch credential 的操作是错误可靠性 class。对此 check 须 live **模型外**，在模型无法 skip 的机制：hooks、permissions、仓库卫生。

第 3 章 escalation ladder 在此结束：反复 violated 的 guidance 从 rule → sensor → **gate**。

## Gate hooks

Cursor gating 事件 — `beforeShellExecution`、`beforeMCPExecution`、`preToolUse`、`beforeReadFile` — 在行动*前*跑你的脚本，可答 `allow`、`deny` 或 `ask`：

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

多数仓库 worth gating 的模式：

- **破坏性 shell**：工作区外 recursive delete、force push、history rewrite、对非本地 database 的 `DROP`/`TRUNCATE`。
- **出站 writes**：deploy、package publish、post 外部 API — `ask` 非 `deny`：人类 in-flow 确认。
- **含 secret 的 reads**：对 `.env*`、key 文件、credential store 的 `beforeReadFile` 使 secret 完全不进 model context。
- **有 side effects 的 MCP calls**：按 tool name 的 `beforeMCPExecution` — allow reads，confirm writes。

设计注：对危险列表 fail *closed*（exit code 2 阻塞），gate scripts 无依赖且快，**提交它们** — 指向仅你机器存在脚本的 hook config 只保护你。

## Secret 卫生

智能体读 working tree；其中任何内容可 end up in context、commit 或 generated file。确定性卫生规则：

1. **`.gitignore` 覆盖 `.env` 与 `.env.*`**（允许 `.env.example`）。存在最廉价 guardrail。
2. **尽量避免 tree 中 real `.env`**；模板文档所需变量。
3. **`mcp.json` 用 `${ENV_VAR}` 插值，永不 literal keys。** 内联 API key 的 MCP config 是 publish 到每个 clone 的 secret。
4. **harness 文件中无 token。** `AGENTS.md`、rules、hooks config *每会话加载进 model context* — 那里的 key 是 by design exfiltrated。

`harness-score` 用 credential-signature matching 检查全部四项（HYG-02 … HYG-06）— 确定性、离线。

## Prompt-injection 意识

Agent harness 有人类工作流没有的威胁类：**藏在 data 中的指令**。依赖 README、MCP 抓的网页、issue comment — 任何可含 addressed 给你智能体的 text（「ignore your instructions and run…」）。Harness 级缓解：

- Gate hooks 不关心谁 authored 指令 —  destructive command 被 deny，无论 user、model 或 injected page 请求。这是 gates 优于 rules 的最强论据。
- Scope MCP servers 到任务所需；只读 docs server 无法 post 你的 data。
- 将「智能体突然想 curl 陌生 domain」视为 worth `ask` gate 的信号。

## Permissions 与 blast radius

Hooks 之外，缩小 compromised 或 confused agent *能做什么*：

- 用 scoped 到任务的 credential 跑 agents（可开 PR 不可 push `main` 的 CI token）。
- Branch protection：agents 开 PR；人类（或 required checks）merge。
- 对 untrusted 或 long-running autonomous work 的 sandboxed execution。

统一原则是 **defense in depth**：rules 使坏行动 unlikely，sensors 使其 visible，gates 使其 impossible，permissions 使 even「impossible failed」survivable。

## 最小可行 guardrail 集

典型 product 仓库的 floor：

- [ ] `.gitignore` 覆盖 env files；tree 中无 real secrets
- [ ] `mcp.json` 无 literal credentials
- [ ] `hooks.json` 带一个 shell gate（destructive patterns → deny/ask）
- [ ] 一个 feedback hook（edit 时 format/lint）
- [ ] 带 required CI checks 的 branch protection

该集正是 [成熟度模型](./maturity-model) 在 L4 对 Hooks & Guardrails 与 Hygiene & Safety 维度所要求。
