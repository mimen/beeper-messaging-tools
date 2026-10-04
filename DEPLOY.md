---
deployment_status: none
deployment_last_assessed: 2026-10-03
deployment_targets:
  - component: web
    where: none
    detail: Local Vite dev or preview server; no hosted deployment
---

# Deployment

The web component runs locally with `bun run dev`, or with `bun run build` followed by `bun run preview`. Its Vite proxy reads the server-side Beeper configuration described in `.env.example`. No hosted deployment or scheduled server is configured. The Mac Mini's Beeper Desktop API is an external dependency, not a deployment of this page.
