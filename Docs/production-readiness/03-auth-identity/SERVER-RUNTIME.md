# Plan 3 Server Runtime Contract

## Deployment boundary

WRS uses same-origin Vercel Functions under `/api/auth/*`. Shared implementation modules live under root `server/` so they are bundled as dependencies of request handlers rather than discovered as standalone Vercel Functions.

Browser code never receives Supabase secret/service-role credentials. Authoritative Auth, PostgREST and RPC access occurs only inside the server boundary.

## Required server environment

- `SUPABASE_URL` or `SUPABASE_PUBLIC_URL`
- `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `WRS_SERVER_SIGNING_SECRET`

Optional separated secrets may override the shared signing secret:

- `WRS_AUTH_CHALLENGE_SECRET`
- `WRS_RATE_LIMIT_SECRET`
- `WRS_OAUTH_COOKIE_SECRET`
- `WRS_PASSPORT_SIGNING_SECRET`

OAuth remains disabled unless both of these are intentionally configured:

- browser flag `VITE_WRS_OAUTH_ENABLED=true`
- server allowlist `WRS_OAUTH_PROVIDERS=google,apple` (only providers actually configured in Supabase should be listed)

## Security invariants

- Access and refresh tokens are held in HTTP-only SameSite cookies.
- Mutations reject explicit cross-site/cross-origin browser requests.
- WRS persists provider session IDs and checks revocation/expiry on every authenticated server request.
- Revoked WRS sessions cannot be resurrected through refresh-token rotation.
- Password reset revokes all known WRS sessions and requests provider-global logout.
- Registration, login, verification, resend and recovery use distributed PostgreSQL rate-limit buckets keyed by server-HMACed subjects.
- OTP attempts and MFA recovery-code redemption are atomic PostgreSQL operations.
- Only one live verification challenge per user/factor and one pending-or-verified MFA factor per user can exist.
- OAuth uses PKCE S256 plus state/nonce validation and a short-lived signed HTTP-only transient cookie.
- Social identities without an existing authoritative WRS profile fail closed; OAuth does not silently create half-provisioned application accounts.

## Provider activation notes

The live Supabase project must configure the actual email/SMS delivery providers and any approved OAuth providers. Code-side verification does not count as live-provider evidence until those integrations are exercised against the dedicated WRS environment.
