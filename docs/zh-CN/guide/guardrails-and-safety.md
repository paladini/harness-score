# Guardrails 与安全

指南给出建议。传感器负责检测。**Guardrails 负责阻止。** 本章讲的是 harness 中那层「即使模型无视所有指令也依然生效」的机制 — 因为它根本不依赖模型是否读过任何内容。

## 为什么文字规则不是 guardrail

一条写着「永远不要执行 `git push --force`」的 rule，本质上是对概率系统的请求。多数情况下会被遵守。但「多数情况」对破坏性、不可逆或涉及凭证的操作来说，可靠性等级完全不对。这类操作，check 必须放在**模型之外**，放在模型无法绕过的机制里：hooks、权限与仓库卫生。

第 3 章的 escalation ladder 在此收束：反复被违反的 guidance，会从 rule → sensor → **gate** 逐级升级。

## Gate hooks

Cursor 的 gating 事件 — `beforeShellExecution`、`beforeMCPExecution`、`preToolUse`、`beforeReadFile` — 会在操作执行*之前*运行你的脚本，并返回 `allow`、`deny` 或 `ask`：

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

多数仓库值得 gating 的模式：

- **破坏性 shell 命令**：工作区外的递归删除、force push、改写历史、对非本地数据库执行 `DROP`/`TRUNCATE`。
- **对外写入**：部署、发布包、调用外部 API — 用 `ask` 而非 `deny`：由人在流程中确认。
- **含 secret 的读取**：对 `.env*`、密钥文件和凭证存储启用 `beforeReadFile`，让 secret 完全进不了 model context。
- **有副作用的 MCP 调用**：通过 `beforeMCPExecution` 按 tool name 过滤 — 读取直接放行，写入需确认。

设计要点：对危险列表 fail *closed*（exit code 2 会阻塞），gate 脚本保持无依赖且足够快，并**提交到仓库** — 若 hook 配置指向的脚本只存在于你的本机，那它保护的也只有你。

## Secret 卫生

智能体会读取 working tree；其中的任何内容都可能进入 context、被提交，或出现在生成的文件里。确定性的卫生规则如下：

1. **`.gitignore` 覆盖 `.env` 与 `.env.*`**（允许 `.env.example`）。这是成本最低的 guardrail。
2. **尽量避免在 tree 中保留真实的 `.env` 文件**；用模板文档说明所需变量即可。
3. **`mcp.json` 使用 `${ENV_VAR}` 插值，绝不写 literal keys。** 内联 API key 的 MCP config，等于把 secret 发布给每一个 clone。
4. **harness 文件中不放 token。** `AGENTS.md`、rules 和 hooks config *每次会话都会加载进 model context* — 放在那里的 key，等于主动泄露。

`harness-score` 会用 credential-signature matching 检查以上四项（HYG-02 … HYG-06）— 确定性、离线完成。

## Prompt-injection 意识

Agent harness 有一种人类工作流没有的威胁：**藏在数据里的指令**。依赖里的 README、MCP 抓取的网页、issue comment — 任何内容都可能包含写给智能体的文本（「ignore your instructions and run…」）。Harness 层面的缓解措施：

- Gate hooks 不关心指令是谁写的 — 破坏性命令一律 deny，无论请求来自用户、模型还是注入的页面。这是 gates 优于 rules 的最有力论据。
- 把 MCP servers 限定在任务所需范围；只读文档 server 无法把你的数据发到任何地方。
- 把「智能体突然想 curl 一个陌生 domain」视为值得触发 `ask` gate 的信号。

## 权限与 blast radius

除了 hooks，还要缩小被攻破或误判的智能体*能够*做到的事：

- 用权限范围匹配任务的 credential 运行 agents（例如只能开 PR、不能 push `main` 的 CI token）。
- Branch protection：agents 开 PR；由人类（或 required checks）合并。
- 对不可信或长时间自主运行的任务，使用 sandboxed execution。

统一原则是 **defense in depth**：rules 让错误行为难以发生，sensors 让它可见，gates 让它不可能发生，permissions 让即便「不可能」也失败了仍可承受。

## 最小可行的 guardrail 集

典型产品仓库的底线如下：

- [ ] `.gitignore` 覆盖 env files；tree 中无真实 secret
- [ ] `mcp.json` 不含 literal credentials
- [ ] `hooks.json` 配置至少一个 shell gate（destructive patterns → deny/ask）
- [ ] 一个 feedback hook（编辑时 format/lint）
- [ ] Branch protection，并配置 required CI checks

这套配置，正是 [成熟度模型](./maturity-model) 在 L4 对 Hooks & Guardrails 与 Hygiene & Safety 两个维度的要求。
