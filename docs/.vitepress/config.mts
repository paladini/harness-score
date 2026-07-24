import { defineConfig, type HeadConfig } from 'vitepress';
import { hreflangPath, LOCALES, localeFromRelativePath, neutralPagePath } from './theme/i18n/localePath';

const SITE = 'https://paladini.github.io/harness-score';
const BASE = '/harness-score/';
const SHOWCASE = 'https://paladini.io/harness-maturity-showcase/';
const FOOTER_COPYRIGHT =
  'Copyright © 2026 <a href="https://paladini.github.io" target="_blank" rel="noopener">Fernando Paladini</a>';

type SidebarItem = { text: string; link: string };

const guideItemsEn: SidebarItem[] = [
  { text: '1 · What is Harness Engineering', link: '/guide/what-is-harness-engineering' },
  { text: '2 · Multi-Harness Support', link: '/guide/multi-harness' },
  { text: '3 · The Cursor Harness Surface', link: '/guide/cursor-harness-surface' },
  { text: '4 · Guides — Feedforward', link: '/guide/guides-feedforward' },
  { text: '5 · Sensors — Feedback', link: '/guide/sensors-feedback' },
  { text: '6 · Guardrails & Safety', link: '/guide/guardrails-and-safety' },
  { text: '7 · The Maturity Model', link: '/guide/maturity-model' },
  { text: '8 · Measure & Improve', link: '/guide/measure-and-improve' },
  { text: '9 · Metrics & Codes', link: '/guide/metrics-and-codes' },
  { text: '10 · References', link: '/guide/references' },
];

const guideItemsPt: SidebarItem[] = [
  { text: '1 · O que é engenharia de harness', link: '/guide/what-is-harness-engineering' },
  { text: '2 · Suporte multi-harness', link: '/guide/multi-harness' },
  { text: '3 · A superfície de harness do Cursor', link: '/guide/cursor-harness-surface' },
  { text: '4 · Guias — feedforward', link: '/guide/guides-feedforward' },
  { text: '5 · Sensores — feedback', link: '/guide/sensors-feedback' },
  { text: '6 · Guardrails e segurança', link: '/guide/guardrails-and-safety' },
  { text: '7 · O modelo de maturidade', link: '/guide/maturity-model' },
  { text: '8 · Medir e melhorar', link: '/guide/measure-and-improve' },
  { text: '9 · Métricas e códigos', link: '/guide/metrics-and-codes' },
  { text: '10 · Referências', link: '/guide/references' },
];

const guideItemsEs: SidebarItem[] = [
  { text: '1 · Qué es la ingeniería de harness', link: '/guide/what-is-harness-engineering' },
  { text: '2 · Soporte multi-harness', link: '/guide/multi-harness' },
  { text: '3 · La superficie de harness de Cursor', link: '/guide/cursor-harness-surface' },
  { text: '4 · Guías — feedforward', link: '/guide/guides-feedforward' },
  { text: '5 · Sensores — feedback', link: '/guide/sensors-feedback' },
  { text: '6 · Guardrails y seguridad', link: '/guide/guardrails-and-safety' },
  { text: '7 · El modelo de madurez', link: '/guide/maturity-model' },
  { text: '8 · Medir y mejorar', link: '/guide/measure-and-improve' },
  { text: '9 · Métricas y códigos', link: '/guide/metrics-and-codes' },
  { text: '10 · Referencias', link: '/guide/references' },
];

const guideItemsZh: SidebarItem[] = [
  { text: '1 · 什么是 harness 工程', link: '/guide/what-is-harness-engineering' },
  { text: '2 · 多 harness 支持', link: '/guide/multi-harness' },
  { text: '3 · Cursor harness 表面', link: '/guide/cursor-harness-surface' },
  { text: '4 · 指南 — feedforward', link: '/guide/guides-feedforward' },
  { text: '5 · 传感器 — feedback', link: '/guide/sensors-feedback' },
  { text: '6 · Guardrails 与安全', link: '/guide/guardrails-and-safety' },
  { text: '7 · 成熟度模型', link: '/guide/maturity-model' },
  { text: '8 · 测量与改进', link: '/guide/measure-and-improve' },
  { text: '9 · 指标与代码', link: '/guide/metrics-and-codes' },
  { text: '10 · 参考资料', link: '/guide/references' },
];

const guideItemsHi: SidebarItem[] = [
  { text: '1 · harness engineering क्या है', link: '/guide/what-is-harness-engineering' },
  { text: '2 · Multi-harness समर्थन', link: '/guide/multi-harness' },
  { text: '3 · Cursor harness surface', link: '/guide/cursor-harness-surface' },
  { text: '4 · Guides — feedforward', link: '/guide/guides-feedforward' },
  { text: '5 · Sensors — feedback', link: '/guide/sensors-feedback' },
  { text: '6 · Guardrails और सुरक्षा', link: '/guide/guardrails-and-safety' },
  { text: '7 · परिपक्वता मॉडल', link: '/guide/maturity-model' },
  { text: '8 · मापें और सुधारें', link: '/guide/measure-and-improve' },
  { text: '9 · Metrics & Codes', link: '/guide/metrics-and-codes' },
  { text: '10 · संदर्भ', link: '/guide/references' },
];

const sharedTheme = {
  logo: '/logo.svg',
  logoLink: BASE,
  siteTitle: '<span class="hs-product-wordmark"><b>harness</b><i>score</i></span>',
  socialLinks: [{ icon: 'github', link: 'https://github.com/paladini/harness-score' }],
  search: { provider: 'local' as const },
  outline: { level: [2, 3] as [number, number] },
};

export default defineConfig({
  title: 'Harness Score',
  description:
    'The harness engineering guide for AI coding agents — measure your harness maturity across Cursor, Claude Code, Windsurf, and other tools with a deterministic scanner.',
  base: BASE,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap',
      },
    ],
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      description:
        'The harness engineering guide for AI coding agents — measure your harness maturity with a deterministic scanner.',
      themeConfig: {
        ...sharedTheme,
        nav: [
          { text: 'Guide', link: '/guide/what-is-harness-engineering' },
          { text: 'Maturity Model', link: '/guide/maturity-model' },
          { text: 'Showcase', link: SHOWCASE, target: '_self' },
        ],
        sidebar: [{ text: 'The Guide', items: guideItemsEn.map((i) => ({ ...i })) }],
        footer: {
          message: 'Released under the MIT License.',
          copyright: FOOTER_COPYRIGHT,
        },
        docFooter: { prev: 'Previous', next: 'Next' },
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        langMenuLabel: 'Change language',
        returnToTopLabel: 'Return to top',
        darkModeSwitchLabel: 'Appearance',
        sidebarMenuLabel: 'Menu',
      },
    },
    'pt-BR': {
      label: 'Português',
      lang: 'pt-BR',
      link: '/pt-BR/',
      description:
        'Guia de engenharia de harness para agentes de código com IA — meça a maturidade do seu harness com um scanner determinístico.',
      themeConfig: {
        ...sharedTheme,
        nav: [
          { text: 'Guia', link: '/pt-BR/guide/what-is-harness-engineering' },
          { text: 'Maturidade', link: '/pt-BR/guide/maturity-model' },
          { text: 'Showcase', link: SHOWCASE, target: '_self' },
        ],
        sidebar: [
          { text: 'O guia', items: guideItemsPt.map((i) => ({ text: i.text, link: `/pt-BR${i.link}` })) },
        ],
        footer: {
          message: 'Licenciado sob MIT.',
          copyright: FOOTER_COPYRIGHT,
        },
        docFooter: { prev: 'Anterior', next: 'Próximo' },
        outline: { label: 'Nesta página' },
        lastUpdated: { text: 'Última atualização' },
        langMenuLabel: 'Idioma',
        returnToTopLabel: 'Voltar ao topo',
        darkModeSwitchLabel: 'Aparência',
        sidebarMenuLabel: 'Menu',
      },
    },
    es: {
      label: 'Español',
      lang: 'es-419',
      link: '/es/',
      description:
        'Guía de ingeniería de harness para agentes de código con IA — mide la madurez de tu harness con un escáner determinista.',
      themeConfig: {
        ...sharedTheme,
        nav: [
          { text: 'Guía', link: '/es/guide/what-is-harness-engineering' },
          { text: 'Madurez', link: '/es/guide/maturity-model' },
          { text: 'Showcase', link: SHOWCASE, target: '_self' },
        ],
        sidebar: [
          { text: 'La guía', items: guideItemsEs.map((i) => ({ text: i.text, link: `/es${i.link}` })) },
        ],
        footer: {
          message: 'Publicado bajo licencia MIT.',
          copyright: FOOTER_COPYRIGHT,
        },
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        outline: { label: 'En esta página' },
        lastUpdated: { text: 'Última actualización' },
        langMenuLabel: 'Idioma',
        returnToTopLabel: 'Volver arriba',
        darkModeSwitchLabel: 'Aparencia',
        sidebarMenuLabel: 'Menú',
      },
    },
    'zh-CN': {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      description: '面向 AI 编码智能体的 harness 工程指南 — 用确定性扫描器测量 harness 成熟度。',
      themeConfig: {
        ...sharedTheme,
        nav: [
          { text: '指南', link: '/zh-CN/guide/what-is-harness-engineering' },
          { text: '成熟度', link: '/zh-CN/guide/maturity-model' },
          { text: 'Showcase', link: SHOWCASE, target: '_self' },
        ],
        sidebar: [
          { text: '指南', items: guideItemsZh.map((i) => ({ text: i.text, link: `/zh-CN${i.link}` })) },
        ],
        footer: {
          message: '基于 MIT 许可证发布。',
          copyright: FOOTER_COPYRIGHT,
        },
        docFooter: { prev: '上一页', next: '下一页' },
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新' },
        langMenuLabel: '语言',
        returnToTopLabel: '返回顶部',
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单',
      },
    },
    'hi-IN': {
      label: 'हिन्दी',
      lang: 'hi-IN',
      link: '/hi-IN/',
      description: 'AI कोडिंग एजेंटों के लिए harness engineering गाइड — निश्चित scanner से harness परिपक्वता मापें।',
      themeConfig: {
        ...sharedTheme,
        nav: [
          { text: 'गाइड', link: '/hi-IN/guide/what-is-harness-engineering' },
          { text: 'परिपक्वता', link: '/hi-IN/guide/maturity-model' },
          { text: 'Showcase', link: SHOWCASE, target: '_self' },
        ],
        sidebar: [
          { text: 'गाइड', items: guideItemsHi.map((i) => ({ text: i.text, link: `/hi-IN${i.link}` })) },
        ],
        footer: {
          message: 'MIT License के तहत जारी।',
          copyright: FOOTER_COPYRIGHT,
        },
        docFooter: { prev: 'पिछला', next: 'अगला' },
        outline: { label: 'इस पृष्ठ पर' },
        lastUpdated: { text: 'अंतिम अपडेट' },
        langMenuLabel: 'भाषा',
        returnToTopLabel: 'ऊपर जाएँ',
        darkModeSwitchLabel: 'दिखावट',
        sidebarMenuLabel: 'मेनू',
      },
    },
  },
  transformHead({ pageData }) {
    const head: HeadConfig[] = [];
    const neutral = neutralPagePath(pageData.relativePath);
    const currentLocale = localeFromRelativePath(pageData.relativePath);

    const absoluteUrl = (locale: (typeof LOCALES)[number]['id']) => {
      const path = hreflangPath(locale, neutral);
      return path === '/' ? `${SITE}/` : `${SITE}${path}`;
    };

    head.push(['link', { rel: 'canonical', href: absoluteUrl(currentLocale) }]);

    for (const locale of LOCALES) {
      head.push(['link', { rel: 'alternate', hreflang: locale.hreflang, href: absoluteUrl(locale.id) }]);
    }
    head.push(['link', { rel: 'alternate', hreflang: 'x-default', href: absoluteUrl('root') }]);

    return head;
  },
});
