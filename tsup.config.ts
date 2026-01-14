import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.js' : '.mjs',
        dts: format === 'cjs' ? '.d.ts' : '.d.mts',
      };
    },
  },
  // CLI build
  {
    entry: ['src/cli/index.ts'],
    format: ['cjs'],
    outDir: 'dist/cli',
    clean: false,
    minify: false, // Keep readable for debugging
  },
]);