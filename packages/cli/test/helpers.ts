import type { ScanContext } from '../src/index.js';

/** In-memory ScanContext for unit-testing individual checks. */
export function fakeContext(files: Record<string, string>): ScanContext {
  const paths = Object.keys(files).sort();
  return {
    root: '/fake',
    files: paths,
    truncated: false,
    has: (p) => Object.hasOwn(files, p),
    read: (p) => (Object.hasOwn(files, p) ? files[p]! : null),
    matching: (re) => paths.filter((p) => re.test(p)),
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
