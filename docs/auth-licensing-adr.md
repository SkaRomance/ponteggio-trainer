# ADR-0001: Auth, Licensing, and Evidence Persistence

**Status:** Proposed
**Date:** 2026-04-26
**Deciders:** Product, Engineering, Training Operations

## Context

- The app is currently a Vite SPA deployed on Vercel with no backend auth or persistence layer.
- The frontend already models `anonymous`, `customer`, `instructor`, and `admin` roles plus license status and feature flags in `src/models/accessControl.ts`.
- The frontend already captures session evidence fields and produces JSON/CSV exports with session ID, scenario seed, event log, phase outcomes, and a client-side integrity hash.
- The next increment needs concrete backend boundaries without forcing a migration away from the current Vite codebase.

## Decision

- Keep the current Vite frontend and add a backend control plane through Vercel Functions under `/api/*`.
- Use one OIDC-compatible identity provider with two entry points:
  - customer/instructor login for tenant users
  - admin login for internal platform admins
- Issue server-managed, HttpOnly session cookies after login. Do not use `localStorage` as the source of truth for authentication or license enforcement.
- Store relational data in PostgreSQL and immutable evidence artifacts in object storage.
- Treat `tenant_id` as the hard security boundary for users, licenses, sessions, and artifacts.
- License the product at tenant level with a fixed 3-year term from `issued_at` to `expires_at`.
- Preserve the current frontend evidence payload shape as input, but finalize and hash the canonical evidence package on the server.

## Options Considered

### Option A: Extend the Vite app with Vercel Functions

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low to medium |
| Cost | Moderate and incremental |
| Scalability | Sufficient for app auth, licensing, and evidence APIs |
| Team familiarity | High |

**Pros:** Minimal disruption, keeps the current frontend intact, easy phased rollout, works with the existing Vercel deployment model.

**Cons:** Requires explicit API design and shared auth/session handling because the app is not a full-stack framework.

### Option B: Rebuild as a full-stack framework before adding auth

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | High upfront |
| Scalability | Good |
| Team familiarity | Lower for this repo today |

**Pros:** Tighter frontend/backend integration.

**Cons:** Delays delivery, increases migration risk, and mixes platform work with product work that can be shipped incrementally now.

## Trade-off Analysis

Option A is the better fit because the missing capability is backend control, not a frontend rewrite. The current client already contains the right domain signals: roles, license features, session metadata, evidence versions, event logs, and exports. Adding a narrow API layer lets the team replace local-only enforcement with server truth in phases while leaving ongoing UI and gameplay work alone.

## Architecture

### Authentication

| Area | Decision |
|------|----------|
| Customer auth | Tenant-scoped OIDC login for `customer` and `instructor` users. Baseline flow is email login; enterprise SSO can be added later without changing the API contract. |
| Admin auth | Separate admin login entry point, separate OIDC client/application, MFA required, and access only when the identity carries a `platform_admin` claim or equivalent allow-list membership. |
| Session model | Backend exchanges the OIDC result for a signed, HttpOnly session cookie used by the SPA for `/api/*` calls. |
| Session lifetime | Customer sessions: up to 7 days absolute, 12 hours idle. Admin sessions: up to 8 hours absolute, 30 minutes idle. |
| Logout | Server-side session revocation plus client cookie deletion. |

### Authorization

- `admin` is a platform role, not a tenant membership.
- `customer` and `instructor` are tenant-scoped roles resolved from membership records.
- License checks happen on the server and return feature entitlements to the SPA.
- Expired or revoked tenants keep read-only access to historical evidence but lose `full_course`, `session_sync`, `updates`, and `vr_runtime`.

### Tenant boundaries

- Every row in tenant-owned tables carries `tenant_id`.
- The backend derives the active tenant from the authenticated session or an explicit membership switch endpoint.
- The client may display a tenant identifier but the backend must never trust a raw `tenantId` from the browser for authorization.
- Object storage keys are prefixed by tenant and session, for example:
  - `tenant/{tenantId}/sessions/{sessionId}/report.json`
  - `tenant/{tenantId}/sessions/{sessionId}/report.csv`
- Platform admins may query across tenants only through `/api/admin/*`, and those actions must be audit logged.
- PostgreSQL row-level security is recommended as defense in depth even if all access already goes through server functions.

### Licensing

| Rule | Decision |
|------|----------|
| License owner | Tenant / organization |
| Term length | Exactly 3 years from `issued_at` |
| Renewal model | Create a new license term row; do not overwrite historical issuance data |
| Plans | `trial`, `professional`, `enterprise` |
| Features | `full_course`, `session_sync`, `admin_sessions`, `updates`, `vr_runtime` |
| Seats | Stored per license and enforced server-side for active tenant members |
| Expiry behavior | New premium sessions blocked after `expires_at`; historical evidence remains readable |

`updates_until` should default to `expires_at` unless commercial policy later separates runtime access from update entitlement.

### Evidence storage

- The existing client payload remains the source payload shape:
  - `sessionId`
  - `scenarioSeed`
  - trainee, instructor, provider, course code, location, VR device
  - started/ended timestamps
  - `mode`
  - `evidenceVersion`
  - event log
  - phase outcomes
  - error list
- The backend stores evidence in two layers:
  - PostgreSQL metadata for queryable fields
  - object storage for the canonical JSON report and derived artifacts such as CSV or PDF
- Finalized evidence is immutable. Before finalization, metadata may be updated only by authorized tenant members.
- On finalize, the backend computes a canonical SHA-256 hash of the stored JSON payload and records:
  - `server_hash`
  - `finalized_at`
  - `finalized_by_user_id`
  - optional `client_hash` from the browser for troubleshooting
- Event records are append-only once a session is finalized.
- Retention and deletion policy must be configurable and must not delete evidence automatically before legal/commercial review defines the retention minimum.

## Minimal data model

| Table | Purpose |
|-------|---------|
| `users` | Global identity record keyed by IdP subject |
| `platform_admins` | Internal admins with cross-tenant access |
| `tenants` | Customer organizations |
| `tenant_memberships` | User-to-tenant mapping with role `customer` or `instructor` |
| `licenses` | Tenant license terms, status, seats, features, issued/expiry dates |
| `training_sessions` | Queryable evidence metadata for each training run |
| `training_session_events` | Normalized event stream for filtering and audits |
| `training_session_artifacts` | Artifact registry with object storage key, hash, type, and timestamps |

## API surface

The frontend should call only `/api/*` endpoints exposed by Vercel Functions.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | Public | Liveness check |
| `POST` | `/api/auth/customer/login` | Public | Start tenant user login |
| `POST` | `/api/auth/admin/login` | Public | Start admin login |
| `GET` | `/api/auth/callback` | Public | OIDC callback, set session cookie |
| `POST` | `/api/auth/logout` | Session | Revoke session and clear cookie |
| `GET` | `/api/me` | Session | Current user, active tenant, memberships, role summary |
| `POST` | `/api/me/tenant` | Session | Switch active tenant when the user has multiple memberships |
| `GET` | `/api/licenses/current` | Session | Active tenant license and feature entitlements |
| `POST` | `/api/evidence/sessions` | Session + active license | Create draft evidence record before a tracked run |
| `PATCH` | `/api/evidence/sessions/{sessionId}` | Session + tenant scope | Update draft session metadata |
| `POST` | `/api/evidence/sessions/{sessionId}/finalize` | Session + tenant scope | Persist final JSON payload, compute hash, generate artifacts |
| `GET` | `/api/evidence/sessions` | Session + tenant scope | List sessions for active tenant |
| `GET` | `/api/evidence/sessions/{sessionId}` | Session + tenant scope | Read one evidence record and artifact links |
| `GET` | `/api/admin/tenants` | Admin | Search tenants and status |
| `POST` | `/api/admin/licenses` | Admin | Issue or renew a tenant license |
| `POST` | `/api/admin/licenses/{licenseId}/revoke` | Admin | Revoke a license |
| `GET` | `/api/admin/sessions` | Admin | Cross-tenant evidence lookup with audit logging |

## Rollout phases

### Phase 0: Documentation and backend contract

- Land this ADR before implementation.
- Keep current client-side demo and report export behavior unchanged.

### Phase 1: Authentication bootstrap

- Add customer and admin login flows.
- Add `/api/me`, `/api/auth/*`, and `/api/licenses/current`.
- Replace `localStorage` access-level truth with server-resolved session and entitlement data.

### Phase 2: Tenant-aware licensing

- Add tenant, membership, and license tables.
- Enforce the 3-year term and feature flags on the server.
- Gate premium session start and VR/runtime sync using server entitlements.

### Phase 3: Evidence persistence

- Add draft session creation and finalization APIs.
- Store canonical JSON reports plus generated artifacts.
- Expose tenant-scoped evidence history to customer and instructor users.

### Phase 4: Admin operations and hardening

- Add admin tenant search, license issuance, revocation, and cross-tenant session lookup.
- Add audit logging, rate limiting, and monitoring.
- Add optional enterprise SSO, configurable retention, and digital-signature follow-up if accreditation requires it.

## Consequences

- The team can ship backend control incrementally without rewriting the frontend.
- License enforcement moves from local trust to server trust.
- Evidence becomes queryable, durable, and tenant-isolated instead of browser-only.
- Admin access becomes intentionally separate and more restrictive than customer access.
- The backend surface stays small, but it becomes a required dependency for premium access and persisted evidence.

## Action Items

1. Create the `api/` implementation plan from the endpoint list above.
2. Define the PostgreSQL schema and object storage key format from the minimal data model.
3. Wire the frontend bootstrap to `/api/me` and `/api/licenses/current` when implementation starts.
4. Confirm `/api/*` routing precedence against the SPA fallback when backend implementation starts.
5. Confirm retention and any signature requirements with legal/training stakeholders before automatic deletion rules are added.
