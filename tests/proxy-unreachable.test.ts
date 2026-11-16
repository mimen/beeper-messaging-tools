import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type ViteDevServer } from 'vite';
import { BeeperClient, connectErrorHint } from '../src/beeper-api';

let vite: ViteDevServer;

beforeAll(async () => {
  // Port 1 refuses connections, standing in for a Mini that is down or off the tailnet.
  process.env.BEEPER_URL = 'http://127.0.0.1:1/v1';
  process.env.BEEPER_ACCESS_TOKEN = 'test-token';
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', server: { port: 0 } });
  await vite.listen();
});

afterAll(async () => {
  await vite.close();
  delete process.env.BEEPER_URL;
  delete process.env.BEEPER_ACCESS_TOKEN;
});

test('reports an unreachable Beeper host as a bad gateway with the reachability hint', async () => {
  const client = new BeeperClient(`${vite.resolvedUrls!.local[0]}api/beeper`);
  const error = await client.getAccounts().then(
    () => new Error('request unexpectedly succeeded'),
    (rejection: Error) => rejection,
  );

  expect(error.message).toContain('(502)');
  expect(connectErrorHint(error)).toContain('reachable');
});
