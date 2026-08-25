# Phase 11.1 — Production Infrastructure

## Goal
Provision isolated WRS staging and production infrastructure and prove that WRS cannot start in a live mode with incomplete authority/provider configuration.

## Repository work completed
- Created `prod/plan-11-activation` from the certified Plans 5–10 head.
- Created draft PR #7 with base `prod/plans-05-10`.
- Added `.env.live.example` as the canonical live environment name manifest.
- Added `scripts/validate-live-env.mjs` with fail-closed checks for runtime authority, all seven production service flags, Supabase authority, Paystack environment keys, private storage, and internal worker/operator credentials.
- Kept demo/staging/production separation explicit; placeholders, localhost and non-HTTPS authority URLs fail the live preflight.

## Connected-resource discovery
### Supabase
Connected organization: `crescivacapital` (`tegnlcoyogetgcyiwnaj`).

Connected projects discovered during this phase:
- `cresciva Project` (`fqragjhmunphhdnmvpgs`) — unrelated to WRS and therefore **not reused**.

There is currently no dedicated WRS staging or production project in the connected Supabase account.

### Vercel
Connected team: `nwosupaul3-gmailcom's projects` (`team_0m722looHPylaECSCKh2f6oa`).

Project discovery returned **0 projects**. No WRS Vercel staging/production project is currently available through the connected Vercel team.

## Review and improvements
- Rejected reuse of the Cresciva Supabase project to prevent cross-product data/secrets contamination.
- Isolated Plan 11 Git history from the large Plans 5–10 PR.
- Added explicit Paystack test/live-key separation so staging cannot accidentally process live payments and production cannot launch with a sandbox key.
- Required distinct high-entropy credentials for scanner, privacy deletion, deployment operations, ecosystem operations, academy assessment, community attendance/moderation, referral qualification and account deletion workers.

## Classification
**EXTERNAL BLOCKER — NOT YET PRODUCTION-READY.**

Repository-side Phase 11.1 controls can be verified, but Phase 11.1 cannot be certified until:
1. a dedicated WRS Supabase organization/project destination is explicitly selected and project creation cost is confirmed;
2. separate WRS staging and production Supabase projects exist and receive the full migration chain;
3. a WRS Vercel project/team is connected or created and staging/production environments are configured;
4. the real staging environment passes `npm run live:preflight` using only staging credentials; and
5. staging can complete authenticated database/API smoke checks without touching unrelated projects.

Do not proceed to a live production GO while any item above remains unresolved.
