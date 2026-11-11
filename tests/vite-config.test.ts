import { describe, expect, test } from 'bun:test';
import { pathStaysUnder, resolveBeeperProxyConfig } from '../vite.config';

describe('resolveBeeperProxyConfig', () => {
  test('defaults to the central Mini v1 API', () => {
    expect(resolveBeeperProxyConfig()).toEqual({
      target: 'https://milads-mac-mini.taild31e9a.ts.net:8448',
      apiPath: '/v1',
    });
  });

  test('preserves a local Beeper Desktop override', () => {
    expect(resolveBeeperProxyConfig('http://localhost:23373/v1/')).toEqual({
      target: 'http://localhost:23373',
      apiPath: '/v1',
    });
  });

  test('rejects a path that normalizes outside /v1', () => {
    expect(() => resolveBeeperProxyConfig('http://127.0.0.1:23373/v1/%2e%2e/secret')).toThrow(/under \/v1/);
  });

  test('rejects an encoded slash that decodes outside /v1', () => {
    expect(() => resolveBeeperProxyConfig('http://127.0.0.1:23373/v1/..%2f..%2fsecret')).toThrow(/under \/v1/);
    expect(() => resolveBeeperProxyConfig('http://127.0.0.1:23373/v1/..%2F..%2Fsecret')).toThrow(/under \/v1/);
    expect(() => resolveBeeperProxyConfig('http://127.0.0.1:23373/v1/..%5c..%5csecret')).toThrow(/under \/v1/);
  });

  test('keeps an encoded slash that stays under the proxy prefix', () => {
    expect(pathStaysUnder('/api/beeper/chats/foo%2Fbar/messages', '/api/beeper')).toBe(true);
  });
});
