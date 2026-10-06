# Standalone WRS Admin Console Design

**Status:** Approved for implementation planning.

## Goal

Give WRS operations a separate frontend in an `admin/` directory that can later be deployed at `admin.worldroboticsystem.com`, while continuing to use the current WRS identity, session, authorization, and operations APIs. Redesign the interface around the supplied dashboard reference, with both light and dark modes.

## Existing system

- The customer application is a React/Vite app rooted at the repository root.
- The admin screen currently lives at `/admin/operations` inside the customer router.
- Admin browser clients call relative `/api/...` paths and include credentials.
- Admin permissions and mutations are enforced by root server routes and database RPCs.
- Session cookies are Secure, HttpOnly, Path `/`, and SameSite=Lax. The API currently expects same-origin requests.
- `vercel.json` applies a restrictive Content Security Policy with `connect-src 'self'`.
- Mantine 8 will be installed as an admin-workspace dependency and is compatible with the repository's React 18 runtime.

## Architecture

### Frontends and shared code

- Keep the existing customer app and authoritative server APIs at repository root.
- Create `admin/` as an npm workspace with its own Vite entry point, router, styles, theme state, and admin screens. It must build independently from the customer app.
- The admin app reuses the existing auth provider, browser auth/account clients, domain types, and authorized admin API endpoints. It does not duplicate sign-in logic, permission checks, or server mutations.
- Add the admin workspace to the root package manager configuration so the repository keeps one dependency lockfile and shared React dependencies.
- When deploying the admin Vercel project with `admin/` as its Root Directory, configure the project to include the required shared source files outside that directory. Keep the admin app's imports to root shared code explicit and limited to the auth, account-client, domain, and admin UI modules it needs.
- Remove the admin page route from the customer-facing router after the standalone route is operational. The server API routes remain at root.

### API origin and session security

- Add an admin-build API-origin setting. Empty means relative same-origin requests for the current customer app; the admin production build points to the existing WRS API origin. Local development may use the existing local API handler through a configured proxy.
- Browser requests from the admin app use `credentials: 'include'` and target the authoritative API host. The API keeps its current host-only Secure, HttpOnly, SameSite=Lax session cookies; do not broaden cookie Domain to every subdomain.
- Add exact-origin CORS handling for the configured admin origin, including credentialed requests and preflight. Never use wildcard origins with credentials.
- Update same-origin/CSRF checks to accept only the primary WRS web origin and explicitly configured admin origin. Mutating operations remain protected by origin checks, session validation, role permission checks, step-up MFA where required, and audited server actions.
- Update the admin deployment CSP so `connect-src` permits only self and the configured WRS API origin. Preserve the security headers and same-origin policy for the customer app.
- Keep OAuth redirect validation restricted to known WRS origins. The admin may use existing login/session flows; it must not add a second identity provider or allow arbitrary redirect URLs.

### Deployment boundary

- `admin/` is the root directory for a future independent Vercel project. That project receives the `admin.worldroboticsystem.com` domain when the operator configures DNS and Vercel project settings.
- The root app continues to deploy from the repository root and owns the API functions. No DNS change or production deployment is part of this work.
- Add environment documentation for the admin API origin, local development proxy, allowed admin web origin, Vercel Root Directory, and source-outside-root setting.

## Interface design

- Use the supplied image as the layout reference: compact left workspace navigation, restrained top toolbar, four summary cards, queue controls, dense records table, and pagination.
- Apply Mantine components and theming in the admin app only. The customer app retains its existing visual system and theme behavior.
- Provide an admin-branded sign-in route for unauthenticated operators using the shared auth provider and existing auth API. Do not expose consumer registration or consumer navigation from the standalone admin app.
- Provide an admin-local light/dark switch, defaulting to light to match the reference. Persist the choice under an admin-specific local-storage key; do not couple it to customer account preferences.
- Keep role-filtered navigation and all existing operator scopes: Overview, Users & KYC, Support, Finance, Deployments, Data Review, Trust & Safety, and Rewards.
- Retain API-backed search/status filters, record details, next-page loading, audited action review, and MFA requirements. Summary cards must only count records the signed-in operator is authorized to view.
- Keep action controls contextual to the selected record and role. Preserve server-side action enforcement as the source of truth.
- On narrow screens, collapse the sidebar behind an accessible menu control; tables may use stacked record rows while retaining the same data and actions.
- Provide explicit loading, empty, filtered-empty, error/retry, and permission-denied states.

## Data flow

1. Admin app starts the shared auth provider and checks the existing session against the API origin.
2. Unauthenticated operators use the admin-branded sign-in route backed by existing auth endpoints. After sign-in, the protected route preserves the current operator role/permission checks.
3. Scope navigation requests the same authorized admin snapshots currently used by WRS.
4. Queue actions submit to the existing API with the current session, origin, reason, and required MFA proof.
5. Server permission checks and database RPCs continue to decide whether the action succeeds; the UI refreshes the relevant queue after success.

## Error handling and safety

- Missing API-origin configuration in an admin production build is a clear startup/build error rather than silently sending admin credentials to the admin static host.
- CORS rejects unknown origins. CSRF protection does not accept arbitrary subdomains or untrusted `Origin` values.
- API or session failure shows a recoverable error and retry state; it does not fall back to demo records or grant client-only access.
- Unauthorized scopes remain inaccessible even if a user manually edits the URL.
- Do not expose unprojected row JSON or add new server permissions as part of the visual migration.

## Verification and acceptance criteria

- Root customer app and `admin/` workspace both build independently.
- Shared login/session works from the admin origin against the authoritative API, with exact-origin credentialed CORS and CSRF behavior.
- Existing role restrictions, audited actions, and MFA step-up behavior remain intact.
- Unknown origins and unsupported roles/scopes are rejected by the server.
- Light and dark theme toggle works, persists across refresh, and does not change the customer app theme.
- Dashboard follows the supplied hierarchy at desktop and mobile widths, with accessible navigation, table actions, status labels, and empty/error states.
- Existing server contract tests and focused admin browser checks pass; no production domain or deployment is changed during implementation.

## Out of scope

- DNS changes, production Vercel project creation, and domain assignment.
- Duplicating or relocating the WRS server/API backend.
- Adding new operator capabilities, permissions, or database mutation paths.
- Changing the customer app theme or settings.
