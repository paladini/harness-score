import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    'harness/registry': 'src/harness/registry.ts',
  },
  format: ['esm'],
  target: 'es2022',
  platform: 'node',
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: true,
  minify: true,
  shims: false,
  skipNodeModulesBundle: true,
});
