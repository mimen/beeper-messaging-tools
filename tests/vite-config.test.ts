import { describe, expect, test } from 'bun:test';
import { resolveBeeperProxyConfig } from '../vite.config';

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
});
