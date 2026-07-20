import type { LocaleId } from './localePath';

export interface LandingCopy {
  levels: { n: number; name: string; hint: string }[];
  toolStatus: { flagship: string; supported: string };
  installs: {
    title: string;
    cmd: string;
    note: string;
    href: string;
    external: boolean;
    primary: boolean;
  }[];
  pitch: { eyebrow: string; title: string; lede: string };
  steps: {
    eyebrow: string;
    items: { title: string; body: string }[];
  };
  terminal: {
    eyebrow: string;
    title: string;
    lede: string;
    cta: string;
    ariaLabel: string;
  };
  install: { eyebrow: string; title: string };
  maturity: { eyebrow: string; title: string; lede: string; cta: string };
  tools: { eyebrow: string; title: string; lede: string; cta: string };
  showcase: {
    eyebrow: string;
    title: string;
    lede: string;
    gallery: string;
    embeds: string;
    cardAlt: string;
  };
  products: {
    eyebrow: string;
    items: { title: string; body: string; href: string; external?: boolean }[];
  };
  guidePath: string;
  maturityPath: string;
  multiHarnessPath: string;
  measurePath: string;
  measureShowPath: string;
  measureEmbedPath: string;
  whatIsPath: string;
}

const terminalSample = `  harness-score v1.0.0  ~/my-app

  Maturity: L2 · Guided   Score: 70/108 (65%)
  Detected: Cursor, Claude Code

  Context & Guides     ████████████████░░░░  80%
  Skills & Commands    █████████████░░░░░░░  65%
  Hooks & Guardrails   ░░░░░░░░░░░░░░░░░░░░   0%
  Sensors & Feedback   ████████████████░░░░  80%
  CI Feedback          ██████████████░░░░░░  71%
  Hygiene & Safety     ███████████████░░░░░  74%

  To reach L3: sensors ≥ 60%; ci ≥ 50%`;

export const LANDING: Record<LocaleId, LandingCopy> = {
  root: {
    levels: [
      { n: 0, name: 'Unharnessed', hint: 'Cold-start every session' },
      { n: 1, name: 'Documented', hint: 'AGENTS.md orients the agent' },
      { n: 2, name: 'Guided', hint: 'Rules, skills, hygiene' },
      { n: 3, name: 'Sensing', hint: 'Tests, types, CI verify work' },
      { n: 4, name: 'Self-correcting', hint: 'Hooks close the loop' },
    ],
    toolStatus: { flagship: 'Flagship', supported: 'Supported' },
    installs: [
      {
        title: 'Run once',
        cmd: 'npx harness-score',
        note: 'No install. Point at any repo path.',
        href: '/guide/measure-and-improve',
        external: false,
        primary: true,
      },
      {
        title: 'npm',
        cmd: 'npm i -g harness-score',
        note: 'v1.1.0 on npmjs.org',
        href: 'https://www.npmjs.com/package/harness-score',
        external: true,
        primary: false,
      },
      {
        title: 'Cursor plugin',
        cmd: '/harness-audit',
        note: 'In repo — Marketplace listing not live yet',
        href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
        external: true,
        primary: false,
      },
      {
        title: 'GitHub Action',
        cmd: 'paladini/harness-score/action',
        note: 'CI gate + README badge',
        href: 'https://github.com/paladini/harness-score/tree/main/action',
        external: true,
        primary: false,
      },
      {
        title: 'JSR',
        cmd: 'npx jsr add @paladini/harness-score',
        note: 'Deno & Bun users',
        href: 'https://jsr.io/@paladini/harness-score',
        external: true,
        primary: false,
      },
    ],
    pitch: {
      eyebrow: 'The problem',
      title: 'Your AI agent is only as reliable as the harness around it.',
      lede: 'Two repos can run the same model and get wildly different results. One has guides that steer the agent, sensors that verify its work, and guardrails that stop damage — the other has none. Harness Score measures that harness in seconds, across any AI tool, and tells you what to fix next.',
    },
    steps: {
      eyebrow: 'How it works',
      items: [
        {
          title: 'Scan',
          body: 'Run npx harness-score in your repo. The CLI reads your filesystem — 36 checks, zero LLM calls, zero network.',
        },
        {
          title: 'Level',
          body: 'Get a maturity level L0–L4, a 108-point breakdown across six dimensions, and the exact gap blocking the next level.',
        },
        {
          title: 'Fix',
          body: "Every failed check links to a remediation recipe in the guide — or let an editor plugin's /harness-audit command apply the fixes.",
        },
      ],
    },
    terminal: {
      eyebrow: 'Example output',
      title: 'A diagnosis, not a vibe check',
      lede: 'Deterministic: same commit, same score — on your laptop or in CI. Gate merges with --min-level 3 so maturity only ratchets up.',
      cta: 'Run the scanner →',
      ariaLabel: 'Example harness-score output',
    },
    install: { eyebrow: 'Get started', title: 'Install anywhere you work' },
    maturity: {
      eyebrow: 'Maturity ladder',
      title: 'Five levels you can measure and gate on',
      lede: 'Levels gate on the shape of your harness — not just points. Eighty points of docs with zero tests is L1, not L3.',
      cta: 'Full maturity model →',
    },
    tools: {
      eyebrow: 'Works with',
      title: 'Any AI coding tool',
      lede: 'One harness, one maturity model, many tools. Configure Cursor, Claude Code, Windsurf, or any other AI tool — Harness Score measures them all the same way.',
      cta: 'Learn about multi-harness support →',
    },
    showcase: {
      eyebrow: 'Show your score',
      title: 'Branded badges for your README',
      lede: '112×20 pill for shield rows. CI regenerates it, or pin a static badge-lN.svg. Copy-paste embeds in Markdown, HTML, iframe, and JSX.',
      gallery: 'Gallery',
      embeds: 'Embed snippets',
      cardAlt: 'Harness Score L4 · Self-correcting share card',
    },
    products: {
      eyebrow: 'What ships in this repo',
      items: [
        {
          title: 'Guide',
          body: '8 chapters on harness engineering for AI coding agents — feedforward, sensors, guardrails.',
          href: '/guide/what-is-harness-engineering',
        },
        {
          title: 'CLI',
          body: 'harness-score — JSON, markdown, badge output. Zero runtime deps.',
          href: '/guide/measure-and-improve',
        },
        {
          title: 'Cursor plugin',
          body: '/harness-audit command + skill to fix every gap the scan finds.',
          href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
          external: true,
        },
        {
          title: 'GitHub Action',
          body: 'Scan on every push, emit the badge, fail below --min-level.',
          href: 'https://github.com/paladini/harness-score/tree/main/action',
          external: true,
        },
      ],
    },
    guidePath: '/guide/measure-and-improve',
    maturityPath: '/guide/maturity-model',
    multiHarnessPath: '/guide/multi-harness',
    measurePath: '/guide/measure-and-improve',
    measureShowPath: '/guide/measure-and-improve#show-your-maturity',
    measureEmbedPath: '/guide/measure-and-improve#embed-snippets',
    whatIsPath: '/guide/what-is-harness-engineering',
  },
  'pt-BR': {
    levels: [
      { n: 0, name: 'Sem harness', hint: 'Recomeça do zero a cada sessão' },
      { n: 1, name: 'Documentado', hint: 'AGENTS.md orienta o agente' },
      { n: 2, name: 'Orientado', hint: 'Rules, skills, higiene' },
      { n: 3, name: 'Com sensores', hint: 'Testes, tipos e CI verificam' },
      { n: 4, name: 'Autocorretivo', hint: 'Hooks fecham o loop' },
    ],
    toolStatus: { flagship: 'Principal', supported: 'Suportado' },
    installs: [
      {
        title: 'Executar uma vez',
        cmd: 'npx harness-score',
        note: 'Sem instalar. Aponte para qualquer repositório.',
        href: '/pt-BR/guide/measure-and-improve',
        external: false,
        primary: true,
      },
      {
        title: 'npm',
        cmd: 'npm i -g harness-score',
        note: 'v1.1.0 no npmjs.org',
        href: 'https://www.npmjs.com/package/harness-score',
        external: true,
        primary: false,
      },
      {
        title: 'Plugin Cursor',
        cmd: '/harness-audit',
        note: 'No repositório — Marketplace ainda não publicado',
        href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
        external: true,
        primary: false,
      },
      {
        title: 'GitHub Action',
        cmd: 'paladini/harness-score/action',
        note: 'Gate de CI + badge no README',
        href: 'https://github.com/paladini/harness-score/tree/main/action',
        external: true,
        primary: false,
      },
      {
        title: 'JSR',
        cmd: 'npx jsr add @paladini/harness-score',
        note: 'Usuários Deno e Bun',
        href: 'https://jsr.io/@paladini/harness-score',
        external: true,
        primary: false,
      },
    ],
    pitch: {
      eyebrow: 'O problema',
      title: 'Seu agente de IA só é tão confiável quanto o harness ao redor dele.',
      lede: 'Dois repositórios podem usar o mesmo modelo e ter resultados muito diferentes. Um tem guias que orientam o agente, sensores que verificam o trabalho e guardrails que evitam danos — o outro não tem nada disso. O Harness Score mede esse harness em segundos, em qualquer ferramenta de IA, e mostra o que corrigir em seguida.',
    },
    steps: {
      eyebrow: 'Como funciona',
      items: [
        {
          title: 'Escanear',
          body: 'Execute npx harness-score no repositório. A CLI lê o filesystem — 36 checks, zero chamadas a LLM, zero rede.',
        },
        {
          title: 'Nível',
          body: 'Receba um nível de maturidade L0–L4, a pontuação em 108 pontos em seis dimensões e exatamente o que falta para o próximo nível.',
        },
        {
          title: 'Corrigir',
          body: 'Cada check que falha aponta para uma receita de remediação no guia — ou use o comando /harness-audit do plugin para aplicar as correções.',
        },
      ],
    },
    terminal: {
      eyebrow: 'Exemplo de saída',
      title: 'Um diagnóstico, não um palpite',
      lede: 'Determinístico: mesmo commit, mesma pontuação — no seu laptop ou no CI. Bloqueie merges com --min-level 3 para a maturidade só subir.',
      cta: 'Executar o scanner →',
      ariaLabel: 'Exemplo de saída do harness-score',
    },
    install: { eyebrow: 'Começar', title: 'Instale onde você trabalha' },
    maturity: {
      eyebrow: 'Escada de maturidade',
      title: 'Cinco níveis que você pode medir e exigir no CI',
      lede: 'Os níveis dependem da forma do harness — não só da pontuação. Oitenta pontos de documentação sem testes é L1, não L3.',
      cta: 'Modelo de maturidade completo →',
    },
    tools: {
      eyebrow: 'Funciona com',
      title: 'Qualquer ferramenta de código com IA',
      lede: 'Um harness, um modelo de maturidade, várias ferramentas. Configure Cursor, Claude Code, Windsurf ou outra — o Harness Score mede todas da mesma forma.',
      cta: 'Saiba mais sobre multi-harness →',
    },
    showcase: {
      eyebrow: 'Mostre sua pontuação',
      title: 'Badges com a marca para o README',
      lede: 'Pílula 112×20 para fileiras de shields. O CI regenera, ou fixe um badge-lN.svg estático. Copie embeds em Markdown, HTML, iframe e JSX.',
      gallery: 'Galeria',
      embeds: 'Snippets de embed',
      cardAlt: 'Harness Score L4 · card de compartilhamento autocorretivo',
    },
    products: {
      eyebrow: 'O que este repositório entrega',
      items: [
        {
          title: 'Guia',
          body: '8 capítulos sobre engenharia de harness para agentes de código — feedforward, sensores, guardrails.',
          href: '/pt-BR/guide/what-is-harness-engineering',
        },
        {
          title: 'CLI',
          body: 'harness-score — saída JSON, markdown e badge. Zero deps em runtime.',
          href: '/pt-BR/guide/measure-and-improve',
        },
        {
          title: 'Plugin Cursor',
          body: 'Comando /harness-audit + skill para corrigir cada gap encontrado.',
          href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
          external: true,
        },
        {
          title: 'GitHub Action',
          body: 'Escaneia a cada push, emite o badge, falha abaixo de --min-level.',
          href: 'https://github.com/paladini/harness-score/tree/main/action',
          external: true,
        },
      ],
    },
    guidePath: '/pt-BR/guide/measure-and-improve',
    maturityPath: '/pt-BR/guide/maturity-model',
    multiHarnessPath: '/pt-BR/guide/multi-harness',
    measurePath: '/pt-BR/guide/measure-and-improve',
    measureShowPath: '/pt-BR/guide/measure-and-improve#show-your-maturity',
    measureEmbedPath: '/pt-BR/guide/measure-and-improve#embed-snippets',
    whatIsPath: '/pt-BR/guide/what-is-harness-engineering',
  },
  es: {
    levels: [
      { n: 0, name: 'Sin harness', hint: 'Empieza de cero en cada sesión' },
      { n: 1, name: 'Documentado', hint: 'AGENTS.md orienta al agente' },
      { n: 2, name: 'Guiado', hint: 'Rules, skills, higiene' },
      { n: 3, name: 'Con sensores', hint: 'Tests, tipos y CI verifican' },
      { n: 4, name: 'Autocorrección', hint: 'Los hooks cierran el ciclo' },
    ],
    toolStatus: { flagship: 'Principal', supported: 'Compatible' },
    installs: [
      {
        title: 'Ejecutar una vez',
        cmd: 'npx harness-score',
        note: 'Sin instalar. Apunta a cualquier repositorio.',
        href: '/es/guide/measure-and-improve',
        external: false,
        primary: true,
      },
      {
        title: 'npm',
        cmd: 'npm i -g harness-score',
        note: 'v1.1.0 en npmjs.org',
        href: 'https://www.npmjs.com/package/harness-score',
        external: true,
        primary: false,
      },
      {
        title: 'Plugin Cursor',
        cmd: '/harness-audit',
        note: 'En el repo — Marketplace aún no publicado',
        href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
        external: true,
        primary: false,
      },
      {
        title: 'GitHub Action',
        cmd: 'paladini/harness-score/action',
        note: 'Gate de CI + badge en README',
        href: 'https://github.com/paladini/harness-score/tree/main/action',
        external: true,
        primary: false,
      },
      {
        title: 'JSR',
        cmd: 'npx jsr add @paladini/harness-score',
        note: 'Usuarios de Deno y Bun',
        href: 'https://jsr.io/@paladini/harness-score',
        external: true,
        primary: false,
      },
    ],
    pitch: {
      eyebrow: 'El problema',
      title: 'Tu agente de IA solo es tan confiable como el harness que lo rodea.',
      lede: 'Dos repos pueden usar el mismo modelo y obtener resultados muy distintos. Uno tiene guías que orientan al agente, sensores que verifican el trabajo y guardrails que evitan daños — el otro no tiene nada de eso. Harness Score mide ese harness en segundos, en cualquier herramienta de IA, y te dice qué corregir después.',
    },
    steps: {
      eyebrow: 'Cómo funciona',
      items: [
        {
          title: 'Escanear',
          body: 'Ejecuta npx harness-score en tu repo. La CLI lee el filesystem — 36 checks, cero llamadas a LLM, cero red.',
        },
        {
          title: 'Nivel',
          body: 'Obtén un nivel de madurez L0–L4, el desglose de 108 puntos en seis dimensiones y exactamente qué falta para el siguiente nivel.',
        },
        {
          title: 'Corregir',
          body: 'Cada check fallido enlaza a una receta de remediación en la guía — o usa el comando /harness-audit del plugin para aplicar las correcciones.',
        },
      ],
    },
    terminal: {
      eyebrow: 'Ejemplo de salida',
      title: 'Un diagnóstico, no una corazonada',
      lede: 'Determinista: mismo commit, misma puntuación — en tu laptop o en CI. Bloquea merges con --min-level 3 para que la madurez solo suba.',
      cta: 'Ejecutar el escáner →',
      ariaLabel: 'Ejemplo de salida de harness-score',
    },
    install: { eyebrow: 'Empezar', title: 'Instala donde trabajas' },
    maturity: {
      eyebrow: 'Escalera de madurez',
      title: 'Cinco niveles que puedes medir y exigir en CI',
      lede: 'Los niveles dependen de la forma del harness — no solo de los puntos. Ochenta puntos de docs sin tests es L1, no L3.',
      cta: 'Modelo de madurez completo →',
    },
    tools: {
      eyebrow: 'Funciona con',
      title: 'Cualquier herramienta de código con IA',
      lede: 'Un harness, un modelo de madurez, muchas herramientas. Configura Cursor, Claude Code, Windsurf u otra — Harness Score las mide igual.',
      cta: 'Más sobre multi-harness →',
    },
    showcase: {
      eyebrow: 'Muestra tu puntuación',
      title: 'Badges con marca para tu README',
      lede: 'Píldora 112×20 para filas de shields. CI la regenera, o fija un badge-lN.svg estático. Copia embeds en Markdown, HTML, iframe y JSX.',
      gallery: 'Galería',
      embeds: 'Snippets de embed',
      cardAlt: 'Harness Score L4 · tarjeta de compartir autocorrección',
    },
    products: {
      eyebrow: 'Qué incluye este repo',
      items: [
        {
          title: 'Guía',
          body: '8 capítulos sobre ingeniería de harness para agentes de código — feedforward, sensores, guardrails.',
          href: '/es/guide/what-is-harness-engineering',
        },
        {
          title: 'CLI',
          body: 'harness-score — salida JSON, markdown y badge. Cero deps en runtime.',
          href: '/es/guide/measure-and-improve',
        },
        {
          title: 'Plugin Cursor',
          body: 'Comando /harness-audit + skill para corregir cada gap encontrado.',
          href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
          external: true,
        },
        {
          title: 'GitHub Action',
          body: 'Escanea en cada push, emite el badge, falla bajo --min-level.',
          href: 'https://github.com/paladini/harness-score/tree/main/action',
          external: true,
        },
      ],
    },
    guidePath: '/es/guide/measure-and-improve',
    maturityPath: '/es/guide/maturity-model',
    multiHarnessPath: '/es/guide/multi-harness',
    measurePath: '/es/guide/measure-and-improve',
    measureShowPath: '/es/guide/measure-and-improve#show-your-maturity',
    measureEmbedPath: '/es/guide/measure-and-improve#embed-snippets',
    whatIsPath: '/es/guide/what-is-harness-engineering',
  },
  'zh-CN': {
    levels: [
      { n: 0, name: '无 harness', hint: '每次会话从零开始' },
      { n: 1, name: '已文档化', hint: 'AGENTS.md 引导智能体' },
      { n: 2, name: '已引导', hint: 'Rules、skills、卫生规范' },
      { n: 3, name: '有传感器', hint: '测试、类型与 CI 验证工作' },
      { n: 4, name: '自我纠正', hint: 'Hooks 闭合反馈环' },
    ],
    toolStatus: { flagship: '旗舰', supported: '已支持' },
    installs: [
      {
        title: '运行一次',
        cmd: 'npx harness-score',
        note: '无需安装。可对任意仓库路径运行。',
        href: '/zh-CN/guide/measure-and-improve',
        external: false,
        primary: true,
      },
      {
        title: 'npm',
        cmd: 'npm i -g harness-score',
        note: 'v1.1.0 在 npmjs.org',
        href: 'https://www.npmjs.com/package/harness-score',
        external: true,
        primary: false,
      },
      {
        title: 'Cursor 插件',
        cmd: '/harness-audit',
        note: '在仓库中 — Marketplace 尚未上线',
        href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
        external: true,
        primary: false,
      },
      {
        title: 'GitHub Action',
        cmd: 'paladini/harness-score/action',
        note: 'CI 门禁 + README 徽章',
        href: 'https://github.com/paladini/harness-score/tree/main/action',
        external: true,
        primary: false,
      },
      {
        title: 'JSR',
        cmd: 'npx jsr add @paladini/harness-score',
        note: 'Deno 与 Bun 用户',
        href: 'https://jsr.io/@paladini/harness-score',
        external: true,
        primary: false,
      },
    ],
    pitch: {
      eyebrow: '问题',
      title: 'AI 智能体的可靠性取决于周围的 harness。',
      lede: '两个仓库可以运行同一模型，结果却天差地别。一个有引导智能体的指南、验证工作的传感器、阻止损害的 guardrails — 另一个什么都没有。Harness Score 在几秒内测量该 harness，适用于任何 AI 工具，并指出下一步该改进什么。',
    },
    steps: {
      eyebrow: '工作原理',
      items: [
        {
          title: '扫描',
          body: '在仓库中运行 npx harness-score。CLI 只读文件系统 — 36 项 check，零大模型调用，零网络。',
        },
        {
          title: '定级',
          body: '获得 L0–L4 成熟度等级、六个维度的 108 分细分，以及阻碍下一等级的具体差距。',
        },
        {
          title: '修复',
          body: '每项失败的 check 都链接到指南中的修复方案 — 或使用编辑器插件的 /harness-audit 命令应用修复。',
        },
      ],
    },
    terminal: {
      eyebrow: '示例输出',
      title: '诊断，而非直觉',
      lede: '确定性：同一 commit，同一分数 — 本地或 CI 结果一致。用 --min-level 3 门禁合并，让成熟度只升不降。',
      cta: '运行扫描器 →',
      ariaLabel: 'harness-score 示例输出',
    },
    install: { eyebrow: '开始', title: '在任何工作环境中安装' },
    maturity: {
      eyebrow: '成熟度阶梯',
      title: '五个可测量、可门禁的等级',
      lede: '等级取决于 harness 的形态 — 不仅是分数。文档满分但零测试仍是 L1，不是 L3。',
      cta: '完整成熟度模型 →',
    },
    tools: {
      eyebrow: '兼容',
      title: '任何 AI 编码工具',
      lede: '一个 harness、一个成熟度模型、多种工具。配置 Cursor、Claude Code、Windsurf 或其他 AI 工具 — Harness Score 以相同方式测量它们。',
      cta: '了解多 harness 支持 →',
    },
    showcase: {
      eyebrow: '展示分数',
      title: 'README 品牌徽章',
      lede: '112×20 胶囊形徽章，适合 README shield 行。CI 自动更新，或固定静态 badge-lN.svg。可复制 Markdown、HTML、iframe 与 JSX 嵌入代码。',
      gallery: '图库',
      embeds: '嵌入片段',
      cardAlt: 'Harness Score L4 · 自我纠正分享卡片',
    },
    products: {
      eyebrow: '本仓库包含',
      items: [
        {
          title: '指南',
          body: '8 章 AI 编码智能体 harness 工程 — feedforward、传感器、guardrails。',
          href: '/zh-CN/guide/what-is-harness-engineering',
        },
        {
          title: 'CLI',
          body: 'harness-score — JSON、markdown、徽章输出。零运行时依赖。',
          href: '/zh-CN/guide/measure-and-improve',
        },
        {
          title: 'Cursor 插件',
          body: '/harness-audit 命令 + skill，修复扫描发现的每个差距。',
          href: 'https://github.com/paladini/harness-score/tree/main/plugins/cursor',
          external: true,
        },
        {
          title: 'GitHub Action',
          body: '每次 push 扫描，生成徽章，低于 --min-level 则失败。',
          href: 'https://github.com/paladini/harness-score/tree/main/action',
          external: true,
        },
      ],
    },
    guidePath: '/zh-CN/guide/measure-and-improve',
    maturityPath: '/zh-CN/guide/maturity-model',
    multiHarnessPath: '/zh-CN/guide/multi-harness',
    measurePath: '/zh-CN/guide/measure-and-improve',
    measureShowPath: '/zh-CN/guide/measure-and-improve#show-your-maturity',
    measureEmbedPath: '/zh-CN/guide/measure-and-improve#embed-snippets',
    whatIsPath: '/zh-CN/guide/what-is-harness-engineering',
  },
};

export const SUPPORTED_TOOLS = ['Cursor', 'Claude Code', 'Windsurf', 'Cline', 'Continue', 'Codex'] as const;

export { terminalSample };
