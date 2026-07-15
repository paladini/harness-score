import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Harness Score',
  description:
    'The harness engineering guide for AI coding agents — measure your harness maturity across Cursor, Claude Code, Windsurf, and other tools with a deterministic scanner.',
  base: '/harness-score/',
  lastUpdated: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/harness-score/favicon.svg' }]],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/what-is-harness-engineering' },
      { text: 'Multi-Harness', link: '/guide/multi-harness' },
      { text: 'Maturity Model', link: '/guide/maturity-model' },
      { text: 'Scanner', link: '/guide/measure-and-improve' },
    ],
    sidebar: [
      {
        text: 'The Guide',
        items: [
          { text: '1 · What is Harness Engineering', link: '/guide/what-is-harness-engineering' },
          { text: '2 · Multi-Harness Support', link: '/guide/multi-harness' },
          { text: '3 · The Cursor Harness Surface', link: '/guide/cursor-harness-surface' },
          { text: '4 · Guides — Feedforward', link: '/guide/guides-feedforward' },
          { text: '5 · Sensors — Feedback', link: '/guide/sensors-feedback' },
          { text: '6 · Guardrails & Safety', link: '/guide/guardrails-and-safety' },
          { text: '7 · The Maturity Model', link: '/guide/maturity-model' },
          { text: '8 · Measure & Improve', link: '/guide/measure-and-improve' },
          { text: '9 · References', link: '/guide/references' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/paladini/harness-score' }],
    search: { provider: 'local' },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Fernando Paladini',
    },
    outline: { level: [2, 3] },
  },
});
