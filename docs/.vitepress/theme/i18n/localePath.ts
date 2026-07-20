export type LocaleId = 'root' | 'pt-BR' | 'es';

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
];

export function localeFromRelativePath(relativePath: string): LocaleId {
  if (relativePath === 'pt-BR/index.md' || relativePath.startsWith('pt-BR/')) return 'pt-BR';
  if (relativePath === 'es/index.md' || relativePath.startsWith('es/')) return 'es';
  return 'root';
}

/** Strip locale prefix and `.md` so `guide/foo.md` and `index.md` share one key. */
export function neutralPagePath(relativePath: string): string {
  let path = relativePath;
  if (path.startsWith('pt-BR/')) path = path.slice('pt-BR/'.length);
  else if (path.startsWith('es/')) path = path.slice('es/'.length);
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
