import { afterEach, describe, expect, test } from 'bun:test';
import { BeeperClient } from '../src/beeper-api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('BeeperClient', () => {
  test('uses the same-origin server proxy without browser authorization', async () => {
    let requestedURL = '';
    let requestedHeaders: Headers | undefined;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requestedURL = input.toString();
      requestedHeaders = new Headers(init?.headers);
      return Response.json([]);
    };

    const client = new BeeperClient();
    await client.getAccounts();

    expect(requestedURL).toBe('/api/beeper/accounts');
    expect(requestedHeaders?.has('authorization')).toBe(false);
  });

  test('uses v1 chat and message routes', async () => {
    const requestedURLs: string[] = [];

    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      requestedURLs.push(input.toString());
      return Response.json({ items: [] });
    };

    const client = new BeeperClient();
    await client.searchChats({ limit: 5, query: 'Milad' });
    await client.searchMessages({ chatID: '!room/id', limit: 10 });

    expect(requestedURLs).toEqual([
      '/api/beeper/chats/search?limit=5&query=Milad',
      '/api/beeper/chats/!room%2Fid/messages',
    ]);
  });
});
