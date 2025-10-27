# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A local web app for interacting with the Beeper Desktop API. Built with Vite + React + TypeScript + Tailwind CSS, this tool displays connected accounts, recent chats, and messages from across multiple messaging networks (WhatsApp, Telegram, Google Messages, Slack, etc.).

## Development Commands

**Package Manager**: Use Bun (not npm/yarn)

```bash
# Install dependencies
bun install

# Start development server (http://localhost:5173)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Architecture

### Beeper API Integration

The official `@beeper/desktop-api` SDK uses RESTful paths (`/v1/accounts`) but the Beeper Desktop API actually uses RPC-style paths (`/v0/get-accounts`). This mismatch required a custom solution.

**Custom SDK** (`src/beeper-api.ts`):
- Lightweight TypeScript wrapper around the Beeper Desktop API
- Uses `/v0` endpoints (not `/v1`)
- RPC-style paths: `/get-accounts`, `/search-chats`, `/search-messages`
- Returns typed responses matching the actual API structure
- All requests use Bearer token authentication

**Key Differences from Official SDK**:
- Endpoint paths: `/v0/get-accounts` vs `/v1/accounts`
- Response structure: API returns `{ items: [...] }` for lists
- Field names: `id` (not `chatID`), `title` (not `name`), `lastActivity` (not `lastMessageAt`)

### CORS & Proxy Setup

The browser cannot directly access `localhost:23373` due to CORS restrictions between different ports.

**Solution**: Vite proxy configuration (`vite.config.ts`)
- Proxies `/v0/*` requests from dev server (`localhost:5173`) to Beeper API (`localhost:23373`)
- Enables browser-based development without CORS issues
- All API calls go through `fetch('/v0/...')` which Vite forwards transparently

### Environment Variables

API token is loaded from `.env`:
```
VITE_BEEPER_ACCESS_TOKEN=your-token-here
```

Token auto-fills the input field on startup (`import.meta.env.VITE_BEEPER_ACCESS_TOKEN`).

**Security**: `.env` is gitignored to prevent credential leaks.

### Prerequisites for Running

1. **Beeper Desktop must be running** (v4.1.169+)
2. **API must be enabled**: Settings → Developers → "Beeper Desktop API"
3. **Access token must be generated**: Settings → Developers → "+" under "Approved connections"
4. API runs on `http://localhost:23373` by default

## Adding New API Methods

To add new Beeper API endpoints to the custom SDK:

1. Check OpenAPI spec: `curl http://localhost:23373/v0/spec | jq '.paths'`
2. Add method to `BeeperClient` class in `src/beeper-api.ts`
3. Follow naming: `/v0/endpoint-name` (use hyphens, not camelCase)
4. API typically returns `{ items: [...] }` for lists
5. Add TypeScript interfaces for request/response types
