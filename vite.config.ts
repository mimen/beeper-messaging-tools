import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_BEEPER_URL = 'https://milads-mac-mini.taild31e9a.ts.net:8448/v1'
const CENTRAL_BEEPER_HOST = 'milads-mac-mini.taild31e9a.ts.net'
const BEEPER_PROXY_PATH = '/api/beeper'
const PROXY_TIMEOUT_MS = 15_000

interface BeeperProxyConfig {
  target: string
  apiPath: string
}

export function resolveBeeperProxyConfig(value?: string): BeeperProxyConfig {
  const url = new URL(value?.trim() || DEFAULT_BEEPER_URL)
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const isCentralMini = url.protocol === 'https:' && url.hostname === CENTRAL_BEEPER_HOST

  if ((!isLoopback && !isCentralMini) || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error('BEEPER_URL must use the central Mini over HTTPS or a loopback development host')
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error('BEEPER_URL must not contain credentials, query parameters, or fragments')
  }

  const apiPath = url.pathname.replace(/\/$/, '')
  // new URL() resolves dot segments before this runs, so "/v1/../secret" arrives as "/secret".
  if (apiPath !== '/v1' && !apiPath.startsWith('/v1/')) {
    throw new Error('BEEPER_URL path must stay under /v1')
  }

  return {
    target: url.origin,
    apiPath,
  }
}

function createBeeperProxy(urlValue: string | undefined, accessToken: string | undefined): ProxyOptions {
  const { target, apiPath } = resolveBeeperProxyConfig(urlValue)
  const token = accessToken?.trim()

  return {
    target,
    changeOrigin: true,
    timeout: PROXY_TIMEOUT_MS,
    proxyTimeout: PROXY_TIMEOUT_MS,
    bypass: (request, response) => {
      // The proxy forwards dot segments raw, so "/api/beeper/../../x" would reach "/x" with the token.
      const { pathname } = new URL(request.url ?? '/', 'http://proxy.invalid')
      if (pathname !== BEEPER_PROXY_PATH && !pathname.startsWith(`${BEEPER_PROXY_PATH}/`)) {
        response.statusCode = 400
        response.end('Beeper proxy path must stay under /api/beeper')
        return false
      }

      if (request.method === 'GET') return

      response.statusCode = 405
      response.setHeader('Allow', 'GET')
      response.end('Beeper proxy is read-only')
      return false
    },
    rewrite: (path) => `${apiPath}${path.replace(BEEPER_PROXY_PATH, '')}`,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyRequest) => {
        proxyRequest.removeHeader('authorization')
        if (token) proxyRequest.setHeader('authorization', `Bearer ${token}`)
      })
      // Beeper echoes any Origin back as allowed; with the token injected above,
      // passing that through would let any website read the user's messages.
      proxy.on('proxyRes', (proxyResponse) => {
        for (const header of Object.keys(proxyResponse.headers)) {
          if (header.startsWith('access-control-')) delete proxyResponse.headers[header]
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'BEEPER_')
  const beeperProxy = createBeeperProxy(
    process.env.BEEPER_URL || env.BEEPER_URL,
    process.env.BEEPER_ACCESS_TOKEN || env.BEEPER_ACCESS_TOKEN,
  )
  const proxy = { [BEEPER_PROXY_PATH]: beeperProxy }

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
