import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import { ServerResponse } from 'node:http'

const DEFAULT_BEEPER_URL = 'https://milads-mac-mini.taild31e9a.ts.net:8448/v1'
const CENTRAL_BEEPER_HOST = 'milads-mac-mini.taild31e9a.ts.net'
const BEEPER_PROXY_PATH = '/api/beeper'
const PROXY_TIMEOUT_MS = 15_000

interface BeeperProxyConfig {
  target: string
  apiPath: string
}

// WHATWG leaves %2f encoded, then the proxy forwards that raw path with the token.
// ponytail: one decode; a server that unescapes twice can still climb.
export function pathStaysUnder(pathname: string, root: string): boolean {
  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  const parts: string[] = []
  for (const segment of decoded.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (parts.length === 0) return false
      parts.pop()
      continue
    }
    parts.push(segment)
  }
  const resolved = `/${parts.join('/')}`
  return resolved === root || resolved.startsWith(`${root}/`)
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
  if (!pathStaysUnder(apiPath, '/v1')) {
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
      const requestURL = request.url ?? '/'
      const { pathname } = new URL(requestURL, 'http://proxy.invalid')
      const rawPath = requestURL.split('?')[0]
      if (!pathStaysUnder(pathname, BEEPER_PROXY_PATH) || !pathStaysUnder(rawPath, BEEPER_PROXY_PATH)) {
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
      // Registered before Vite's own handler, which would answer a refused connection with a bare 500.
      proxy.on('error', (_error, _request, response) => {
        if (response instanceof ServerResponse && !response.headersSent) {
          response.writeHead(502, 'Bad Gateway', { 'Content-Type': 'text/plain' }).end('Beeper host unreachable')
        }
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
    // The page is same-origin; Vite's default cors would let any localhost page read through the token.
    server: { proxy, cors: false },
    preview: { proxy, cors: false },
  }
})
