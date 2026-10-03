---
repo_key: beeper-messaging-tools
aliases: []
---

# beeper-messaging-tools

A local React page for browsing Beeper accounts, chats, and messages through the Beeper Desktop API. It runs under the Vite dev or preview server, which proxies `/api/beeper` to the Mac Mini's Beeper endpoint (or a loopback Beeper Desktop), allows only `GET`, and adds the bearer token from `BEEPER_ACCESS_TOKEN` so the token never reaches the browser. There is no deployment.

## Components

| Component | Path | What it is | Surfaces | Stack |
|---|---|---|---|---|
| web | `src/`, `vite.config.ts` | Read-only Beeper browser page and the Vite proxy that authenticates its API calls. | web | ts, react, vite, tailwind, bun |

`tests/` covers the proxy URL validation in `vite.config.ts` and the client in `src/beeper-api.ts`, run with `bun test`.
