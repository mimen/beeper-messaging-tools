import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type ViteDevServer } from 'vite';

let upstream: ReturnType<typeof Bun.serve>;
let vite: ViteDevServer;

beforeAll(async () => {
  upstream = Bun.serve({
    port: 0,
    fetch: (request) =>
      Response.json([], { headers: { 'access-control-allow-origin': request.headers.get('origin') ?? '*' } }),
  });
  process.env.BEEPER_URL = `http://127.0.0.1:${upstream.port}/v1`;
  process.env.BEEPER_ACCESS_TOKEN = 'test-token';
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', server: { port: 0 } });
  await vite.listen();
});

afterAll(async () => {
  await vite.close();
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
