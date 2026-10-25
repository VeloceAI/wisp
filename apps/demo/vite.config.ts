import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const pkg = (p: string) => fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@veloceai/wisp-core': pkg('core'),
      '@veloceai/wisp-web': pkg('web'),
    },
  },
  server: { port: 5180, strictPort: true },
});
