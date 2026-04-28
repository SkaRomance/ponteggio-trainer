# Wave 3 Plan: Platform Ops, Licensing, and DB-First Access

**Status:** Proposed  
**Date:** 2026-04-28  
**Owners:** Product, Engineering, Training Operations

## Goal

Turn the current auth and evidence bootstrap into a usable platform layer for real customers and internal admins.

At the end of this wave, the product should support:

- database-backed identities, memberships, and license terms as the runtime source of truth
- admin workflows to inspect all sessions and manage tenant licenses
- customer workflows to inspect tenant sessions and current license validity
- hardened login and audit controls that are credible for classroom and VR operations

## Why this wave now

The simulator already has:

- persistent session evidence in Postgres
- tenant-scoped and admin-scoped session listing
- server-managed cookies and backend-driven access state

The main gap is that the control plane is still bootstrap-oriented:

- accounts still originate from environment JSON
- passwords are still compared with SHA-256 only
- there is no admin UI/API for issuing, renewing, or revoking licenses
- customer users do not yet have a dedicated area for license and archive operations

This makes the product deployable as a controlled demo, but not yet as a maintainable platform.

## In Scope

### 1. DB-first identity and membership model

- Move runtime identity resolution from env-configured accounts to database records.
- Keep env bootstrap only as first-run seed or emergency recovery path.
- Add explicit credential storage and status fields needed for operational accounts.
- Prepare multi-membership users without trusting tenant choice from the browser.

### 2. Auth hardening

- Replace plain SHA-256 password comparison with `bcrypt` or `argon2id`.
- Add rate limiting for login and sensitive admin endpoints.
- Add login success/failure audit entries.
- Tighten session issuance and validation around role, tenant, and revocation state.

### 3. Admin license operations

- Add endpoints for issuing, renewing, revoking, and inspecting licenses.
- Treat each renewal as a new term row instead of mutating history.
- Expose seat count, updates entitlement, and expiry in admin flows.
- Preserve the 3-year validity rule as a server-side invariant.

### 4. Admin and customer surfaces

- Add an admin dashboard for:
  - cross-tenant session lookup
  - tenant lookup
  - license status inspection
  - renewal and revocation actions
- Add a customer/instructor area for:
  - tenant-scoped session archive
  - current license status and update entitlement
  - clear messaging on expiry and archive availability

### 5. Evidence operations visibility

- Add session detail retrieval from the archive, not only summary cards.
- Surface persistence failures and finalize outcomes clearly in the UI.
- Keep evidence hashes and server authority visible where needed for audit review.

## Out of Scope

- Full OIDC / enterprise SSO rollout
- Asymmetric digital signatures or qualified signature workflows
- Automated retention deletion policies
- New gameplay phases or new VR scenarios
- Performance/code-splitting work unless required to unblock the new UI

## Implementation Order

### Track A: data model and backend invariants

Files to start from:

- `database/training-schema.sql`
- `api/_lib/db.ts`
- `api/_lib/auth.ts`

Tasks:

1. Add tables or columns for database-managed credentials, account status, and license history.
2. Separate bootstrap seeding from normal request-time identity hydration.
3. Add DB helpers for tenant search, license issuance, renewal, revocation, and account lookup.

### Track B: admin APIs

Files to start from:

- `api/admin/training-sessions.ts`
- `api/admin/sessions.ts`
- `api/licenses/current.ts`

Tasks:

1. Add `/api/admin/tenants`.
2. Add `/api/admin/licenses` and `/api/admin/licenses/{licenseId}/revoke`.
3. Add audit logging for admin actions and rejected access.

### Track C: auth APIs

Files to start from:

- `api/auth/login.ts`
- `api/auth/logout.ts`
- `api/_lib/auth.ts`

Tasks:

1. Introduce hardened password verification.
2. Add login throttling and failure counters.
3. Ensure revoked or expired accounts cannot keep stale sessions alive.

### Track D: frontend platform surfaces

Files to start from:

- `src/stores/gameStore.ts`
- `src/components/ui/AccessStatusPanel.tsx`
- `src/components/ui/EvidenceSessionsPanel.tsx`
- `src/App.css`

Tasks:

1. Add admin actions and customer archive/license views.
2. Add session detail drill-down.
3. Surface server errors and operational messages with less ambiguity.

## Acceptance Criteria

- Admin can log in and inspect sessions across tenants without relying on env-only account state.
- Customer or instructor can log in and see only tenant-scoped sessions and current license data.
- License issue, renewal, and revocation are persisted server-side with history preserved.
- Login uses a hardened password verifier and rejects abusive retry patterns.
- Expired or revoked licenses degrade access consistently while preserving historical evidence read access.
- Build, lint, and typecheck pass after the wave.

## Risks and Dependencies

- Password hardening adds dependency and migration work for bootstrap credentials.
- Rate limiting on Vercel Functions may require an external store if in-memory limits are insufficient.
- Admin/customer UI growth may justify code-splitting in the following wave.
- Legal/commercial validation is still required before retention automation or stronger signature guarantees.

## Suggested Deliverable Split

### Sprint 1

- DB-first account model
- hardened login
- login/admin audit logging

### Sprint 2

- admin license APIs
- admin tenant lookup
- customer/admin dashboard surfaces

### Sprint 3

- session detail view
- failure-state polish
- regression pass on archive and finalize flows
