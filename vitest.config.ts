import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = (p: string) => fileURLToPath(new URL(`./packages/${p}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@veloceai/wisp-core': src('core'),
      '@veloceai/wisp-web': src('web'),
      '@veloceai/wisp-proxy': src('proxy'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
  },
});
