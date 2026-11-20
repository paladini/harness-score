import type { ScanContext } from '../src/index.js';
import { filterGlob } from '../src/references/glob.js';

/** In-memory ScanContext for unit-testing individual checks. */
export function fakeContext(files: Record<string, string>, root = '/fake'): ScanContext {
  const paths = Object.keys(files).sort();
  return {
    root,
    files: paths,
    truncated: false,
    has: (p) => Object.hasOwn(files, p),
    hasDirectory: (p) => paths.some((f) => f.startsWith(`${p}/`)),
    read: (p) => (Object.hasOwn(files, p) ? files[p]! : null),
    matching: (re) => paths.filter((p) => re.test(p)),
    matchingGlob: (pattern) => filterGlob(pattern, paths),
  };
}

export function check(id: string) {
  // Lazy import indirection keeps this helper synchronous for tests.
  return import('../src/index.js').then(({ ALL_CHECKS }) => {
    const found = ALL_CHECKS.find((c) => c.id === id);
    if (!found) throw new Error(`no such check: ${id}`);
    return found;
  });
}
