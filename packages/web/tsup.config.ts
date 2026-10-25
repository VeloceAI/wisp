import { defineConfig } from 'tsup';

export default defineConfig([
  { entry: ['src/index.ts'], format: ['esm', 'cjs'], dts: true, clean: true },
  {
    entry: { wisp: 'src/auto.ts' },
    format: ['iife'],
    minify: true,
    noExternal: [/.*/],
    outExtension: () => ({ js: '.js' }),
  },
]);
