import { afterAll, beforeAll, expect, test } from 'bun:test';
import { connect } from 'node:net';
import { createServer, preview, type PreviewServer, type ViteDevServer } from 'vite';

let upstream: ReturnType<typeof Bun.serve>;
let vite: ViteDevServer;
let previewServer: PreviewServer;
const upstreamPaths: string[] = [];

beforeAll(async () => {
  upstream = Bun.serve({
    port: 0,
    fetch: (request) => {
      upstreamPaths.push(new URL(request.url).pathname);
      return Response.json([], { headers: { 'access-control-allow-origin': request.headers.get('origin') ?? '*' } });
    },
  });
  process.env.BEEPER_URL = `http://127.0.0.1:${upstream.port}/v1`;
  process.env.BEEPER_ACCESS_TOKEN = 'test-token';
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', server: { port: 0 } });
  await vite.listen();
  previewServer = await preview({ configFile: 'vite.config.ts', logLevel: 'silent', preview: { port: 0 } });
});

afterAll(async () => {
  await vite.close();
  await new Promise((resolve) => previewServer.httpServer.close(resolve));
  upstream.stop();
  delete process.env.BEEPER_URL;
  delete process.env.BEEPER_ACCESS_TOKEN;
});

test('does not pass the upstream CORS grant to another origin', async () => {
  const response = await fetch(`${vite.resolvedUrls!.local[0]}api/beeper/accounts`, {
    headers: { origin: 'https://attacker.example' },
  });

  expect(response.status).toBe(200);
  expect(response.headers.get('access-control-allow-origin')).toBeNull();
});

test('does not grant CORS to a page on another loopback port', async () => {
  // Vite's default cors option allows any localhost origin, which would let any local page read through the token.
  for (const base of [vite.resolvedUrls!.local[0], previewServer.resolvedUrls!.local[0]]) {
    const response = await fetch(`${base}api/beeper/accounts`, { headers: { origin: 'http://localhost:3000' } });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  }
});

test('refuses a request path that climbs out of the proxy prefix', async () => {
  // fetch() resolves dot segments, so send the raw request line.
  const { hostname, port } = new URL(vite.resolvedUrls!.local[0]);
  const statusLine = await new Promise<string>((resolve, reject) => {
    const socket = connect(Number(port), hostname, () =>
      socket.write('GET /api/beeper/../../secret HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'),
    );
    let body = '';
    socket.on('data', (chunk) => (body += chunk));
    socket.on('end', () => resolve(body.split('\r\n')[0]));
    socket.on('error', reject);
  });

  expect(statusLine).toBe('HTTP/1.1 400 Bad Request');
  expect(upstreamPaths).not.toContain('/secret');
});
