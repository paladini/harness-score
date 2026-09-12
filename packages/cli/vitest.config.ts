import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Windows process creation can occasionally cross Vitest's 5 s default
    // while these tests spawn the packaged CLI. The benchmark remains the
    // performance gate, so this avoids a platform-only false block.
    testTimeout: process.platform === 'win32' ? 10_000 : 5_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types.ts', 'src/cli.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 80,
      },
    },
  },
});
