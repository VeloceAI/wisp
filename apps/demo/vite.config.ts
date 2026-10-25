import { defineConfig, type Plugin } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toNodeListener } from '../../packages/proxy/src/node';
import { createWispHandler } from '../../packages/proxy/src/handler';

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

/** The owner's proxy, mounted at /wisp. Uses the offline mock AI unless WISP_PROVIDER is set. */
const proxy = (): Plugin => ({
  name: 'wisp-proxy',
  configureServer(server) {
    const env = process.env;
    const listener = toNodeListener(
      createWispHandler({
        provider: { provider: (env.WISP_PROVIDER as never) ?? 'mock', apiKey: env.WISP_API_KEY, model: env.WISP_MODEL },
        guideName: 'Wisp',
        siteName: 'Petal & Thread',
        voice: { enabled: true },
        perVisitor: 50,
      }),
    );
    server.middlewares.use((req, res, next) => (req.url?.startsWith('/wisp/') ? listener(req, res) : next()));
  },
});

export default defineConfig({
  plugins: [serveBundle(), proxy()],
  resolve: {
    alias: {
      '@veloceai/wisp-core': pkg('core'),
      '@veloceai/wisp-web': pkg('web'),
    },
  },
  server: { port: 5180, strictPort: true },
});
