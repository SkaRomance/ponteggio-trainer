# Ponteggio Trainer

`ponteggio-trainer` is a Vite + React + TypeScript training simulator for scaffold safety workflows. The current app already includes multi-phase gameplay, auditable session metadata, client-side JSON/CSV report export, and optional WebXR entry points for classroom or headset-assisted sessions.

## Current scope

- Frontend SPA deployed on Vercel
- Server-synced access model via `/api/me` with admin/customer/instructor roles
- Session evidence fields for trainee, instructor, provider, course code, location, VR device, scenario seed, and timestamps
- Local session report generation with event logs, per-phase outcomes, and evidence-mode warnings
- Bootstrap auth endpoints under `/api/auth/*` using HttpOnly signed cookies and env-configured accounts

## Architecture docs

- [ADR-0001: Auth, Licensing, and Evidence Persistence](./docs/auth-licensing-adr.md)
- [Security Headers Notes](./docs/security-headers.md)

That ADR is the source of truth for:

- admin authentication
- customer and instructor authentication
- 3-year tenant licensing
- session evidence storage and integrity
- tenant boundaries
- Vercel API surface
- staged rollout

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
npm run hash-password -- "my-password"
```

## Backend setup

- Configure `MARS_AUTH_SECRET`, `MARS_EVIDENCE_SECRET`, `MARS_AUTH_ACCOUNTS_JSON`, and `DATABASE_URL` in local or Vercel environments.
- Optional auth hardening envs: `MARS_AUTH_PBKDF2_ITERATIONS`, `MARS_AUTH_RATE_LIMIT_MAX_ATTEMPTS`, `MARS_AUTH_RATE_LIMIT_WINDOW_MS`, `MARS_AUTH_RATE_LIMIT_BLOCK_MS`.
- The persistent training archive schema is versioned in [database/training-schema.sql](./database/training-schema.sql).
- Production is designed around Vercel Functions plus Neon/Postgres; preview and local environments need their own `DATABASE_URL`.

## Notes

- The app is still a client-rendered SPA, but `/api/*` is now reserved for Vercel Functions and excluded from the SPA fallback rewrite.
- Premium access can no longer be unlocked from `localStorage`; role and license state are hydrated from the backend contract.
- The session archive is persistent only when `DATABASE_URL` is configured; without it, auth still works but evidence stays local-only.
- `npm test` runs zero-dependency Node regression tests for inspection no-hint behavior and admin pagination contracts.
- Use [.env.example](./.env.example) as the starting point for auth and database variables.
