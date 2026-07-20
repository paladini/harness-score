import { defineConfig, type HeadConfig } from 'vitepress';
import { hreflangPath, LOCALES, localeFromRelativePath, neutralPagePath } from './theme/i18n/localePath';

const SITE = 'https://paladini.github.io/harness-score';
const BASE = '/harness-score/';
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
  { text: '9 · References', link: '/guide/references' },
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
  { text: '9 · Referências', link: '/guide/references' },
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
  { text: '9 · Referencias', link: '/guide/references' },
];

const sharedTheme = {
  logo: '/logo.svg',
  logoLink: BASE,
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
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }]],
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
          { text: 'Multi-Harness', link: '/guide/multi-harness' },
          { text: 'Maturity Model', link: '/guide/maturity-model' },
          { text: 'Scanner', link: '/guide/measure-and-improve' },
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
          { text: 'Multi-harness', link: '/pt-BR/guide/multi-harness' },
          { text: 'Maturidade', link: '/pt-BR/guide/maturity-model' },
          { text: 'Scanner', link: '/pt-BR/guide/measure-and-improve' },
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
          { text: 'Multi-harness', link: '/es/guide/multi-harness' },
          { text: 'Madurez', link: '/es/guide/maturity-model' },
          { text: 'Escáner', link: '/es/guide/measure-and-improve' },
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
