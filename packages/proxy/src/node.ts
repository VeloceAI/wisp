import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWispHandler, type WispHandler, type WispProxyOptions } from './handler';
import type { AudioCache } from './audio-cache';

/** Adapts the web-standard handler to Node's http / Express `(req, res)` style. */
export function toNodeListener(handler: WispHandler) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const response = await handler(
      new Request(url, { method: req.method, headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body }),
      { ip: req.socket.remoteAddress },
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
}

/** Keeps generated speech on disk so each fixed line is paid for once, even across restarts. */
export function fileAudioCache(dir: string): AudioCache {
  return {
    async get(key) {
      try {
        const buf = await readFile(join(dir, `${key}.mp3`));
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      } catch {
        return null;
      }
    },
    async set(key, audio) {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${key}.mp3`), Buffer.from(audio));
    },
  };
}

export function serve(opts: WispProxyOptions & { port?: number; path?: string }) {
  const listener = toNodeListener(createWispHandler(opts));
  const prefix = (opts.path ?? '/wisp').replace(/\/$/, '');
  const server = createServer((req, res) => {
    if (!req.url?.startsWith(prefix + '/')) {
      res.writeHead(404).end();
      return;
    }
    listener(req, res).catch(() => res.writeHead(500).end());
  });
  server.listen(opts.port ?? 5181);
  return server;
}

export { createWispHandler };
