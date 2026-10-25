import { defineConfig, type Plugin } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = (p: string) => fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url));
const bundle = fileURLToPath(new URL('../../packages/web/dist/wisp.js', import.meta.url));

/** Serves the built one-line bundle so script-tag.html shows the real drop-in experience. */
const serveBundle = (): Plugin => ({
  name: 'wisp-bundle',
  configureServer(server) {
    server.middlewares.use('/wisp.js', (_req, res) => {
      if (!existsSync(bundle)) {
        res.statusCode = 404;
        res.end('Run `npm run build` first.');
        return;
      }
      res.setHeader('Content-Type', 'text/javascript');
      res.end(readFileSync(bundle));
    });
  },
});

export default defineConfig({
  plugins: [serveBundle()],
  resolve: {
    alias: {
      '@veloceai/wisp-core': pkg('core'),
      '@veloceai/wisp-web': pkg('web'),
    },
  },
  server: { port: 5180, strictPort: true },
});
