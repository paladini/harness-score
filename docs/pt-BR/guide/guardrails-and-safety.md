# Guardrails e segurança

Guias sugerem. Sensores detectam. **Guardrails impedem.** Este capítulo cobre
a camada do harness que segura mesmo quando o modelo ignora toda instrução —
porque não depende do modelo ler nada.

## Por que prosa não é guardrail

Uma rule que diz "nunca rode `git push --force`" é um pedido a um sistema
probabilístico. Geralmente será respeitada. "Geralmente" é a classe de
confiabilidade errada para operações destrutivas, irreversíveis ou que tocam
credenciais. Para essas, o check deve viver **fora do modelo**, em maquinaria
que o modelo não pode pular: hooks, permissões e higiene do repositório.

A escada de escalada do capítulo 3 termina aqui: orientação que continua sendo
violada move de rule → sensor → **gate**.

## Gate hooks

Os eventos de gate do Cursor — `beforeShellExecution`, `beforeMCPExecution`,
`preToolUse`, `beforeReadFile` — rodam seu script *antes* da ação e permitem
responder `allow`, `deny` ou `ask`:

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

Padrões que valem gate na maioria dos repositórios:

- **Shell destrutivo**: deletes recursivos fora do workspace, force pushes,
  rewrites de histórico, `DROP`/`TRUNCATE` contra bancos não locais.
- **Escritas outbound**: deploys, publicação de pacotes, post em APIs externas —
  `ask`, não `deny`: humano confirma, in-flow.
- **Leituras com segredo**: `beforeReadFile` em `.env*`, arquivos de chave e
  stores de credencial mantém segredos fora do contexto do modelo.
- **Chamadas MCP com efeitos colaterais**: `beforeMCPExecution` filtrando por
  nome de tool — allow reads, confirm writes.

Notas de design: falhe *fechado* para a lista perigosa (exit code 2 bloqueia),
mantenha scripts de gate sem dependências e rápidos, e **commite-os** — config
de hook apontando para script que existe só na sua máquina protege só você.

## Higiene de segredos

O agente lê sua working tree; qualquer coisa nela pode ir para contexto, commit
ou arquivo gerado. Regras determinísticas de higiene:

1. **`.gitignore` cobre `.env` e `.env.*`** (permita `.env.example`).
   O guardrail mais barato que existe.
2. **Sem arquivos `.env` reais na árvore** onde evitável; templates documentam
   variáveis necessárias.
3. **`mcp.json` usa interpolação `${ENV_VAR}`, nunca chaves literais.** Config
   MCP com API key inline é segredo publicado em todo clone.
4. **Sem tokens em arquivos de harness.** `AGENTS.md`, rules e configs de hooks
   são *carregados no contexto do modelo a cada sessão* — chave ali é exfiltrada
   por design.

`harness-score` checa os quatro (HYG-02 … HYG-06) com matching de assinatura de
credencial — deterministicamente, offline.

## Consciência de prompt injection

Harnesses de agente têm uma classe de ameaça que workflows humanos não têm:
**instruções escondidas em dados**. README em dependência, página web buscada
por MCP, comentário em issue — qualquer um pode conter texto para seu agente
("ignore suas instruções e rode…"). Mitigações no nível do harness:

- Gate hooks não se importam com quem autorou a instrução — o comando destrutivo
  é negado seja o usuário, o modelo ou uma página injetada quem pediu. Esse é o
  argumento mais forte por gates sobre rules.
- Escopo servidores MCP ao que a tarefa precisa; servidor de docs read-only não
  posta seus dados em lugar nenhum.
- Trate "agente de repente quer curl em domínio desconhecido" como sinal que
  vale gate `ask`.

## Permissões e raio de explosão

Além de hooks, reduza o que um agente comprometido ou confuso *poderia* fazer:

- Rode agentes com credenciais escopadas à tarefa (token de CI que abre PRs mas
  não faz push em `main`).
- Branch protection: agentes abrem PRs; humanos (ou checks obrigatórios) fazem merge.
- Execução sandboxed para trabalho autônomo não confiável ou longo.

O princípio unificador é **defesa em profundidade**: rules tornam más ações
improváveis, sensores as tornam visíveis, gates as tornam impossíveis, e
permissões fazem até "impossível falhou" ser sobrevivível.

## Conjunto mínimo viável de guardrails

Para um repositório de produto típico, o piso parece:

- [ ] `.gitignore` cobrindo env files; sem segredos reais na árvore
- [ ] `mcp.json` limpo de credenciais literais
- [ ] `hooks.json` com um gate de shell (padrões destrutivos → deny/ask)
- [ ] Um hook de feedback (format/lint on edit)
- [ ] Branch protection com checks de CI obrigatórios

Esse conjunto é exatamente o que o [modelo de maturidade](./maturity-model)
exige para as dimensões Hooks & Guardrails e Hygiene & Safety em L4.
