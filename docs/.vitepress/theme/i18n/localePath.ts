export type LocaleId = 'root' | 'pt-BR' | 'es' | 'zh-CN';

export interface LocaleMeta {
  id: LocaleId;
  label: string;
  prefix: string;
  hreflang: string;
}

export const LOCALES: LocaleMeta[] = [
  { id: 'root', label: 'English', prefix: '', hreflang: 'en' },
  { id: 'pt-BR', label: 'Português', prefix: 'pt-BR', hreflang: 'pt-BR' },
  { id: 'es', label: 'Español', prefix: 'es', hreflang: 'es-419' },
  { id: 'zh-CN', label: '中文', prefix: 'zh-CN', hreflang: 'zh-CN' },
];

const PREFIXED_LOCALES = LOCALES.filter((locale) => locale.prefix !== '');

export function localeFromRelativePath(relativePath: string): LocaleId {
  for (const locale of PREFIXED_LOCALES) {
    if (relativePath === `${locale.prefix}/index.md` || relativePath.startsWith(`${locale.prefix}/`)) {
      return locale.id;
    }
  }
  return 'root';
}

/** Strip locale prefix and `.md` so `guide/foo.md` and `index.md` share one key. */
export function neutralPagePath(relativePath: string): string {
  let path = relativePath;
  for (const locale of PREFIXED_LOCALES) {
    const prefix = `${locale.prefix}/`;
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length);
      break;
    }
  }
  return path.replace(/\.md$/, '').replace(/\/index$/, '') || 'index';
}

export function localePath(locale: LocaleId, neutralPath: string): string {
  const slug = neutralPath === 'index' ? '' : neutralPath;
  if (locale === 'root') return slug ? `/${slug}` : '/';
  return slug ? `/${locale}/${slug}` : `/${locale}/`;
}

/** hreflang target — home is translated in every locale. */
export function hreflangPath(locale: LocaleId, neutralPath: string): string {
  return localePath(locale, neutralPath);
}

export function switchLocalePath(
  currentLocale: LocaleId,
  targetLocale: LocaleId,
  relativePath: string,
): string {
  if (currentLocale === targetLocale) return localePath(targetLocale, neutralPagePath(relativePath));
  const neutral = neutralPagePath(relativePath);
  return localePath(targetLocale, neutral);
}
