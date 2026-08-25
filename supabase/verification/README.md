# WRS Supabase Verification SQL

These files are **read-only production/staging verification queries**. They are not migrations and must not be inserted into the `supabase/migrations` timestamp sequence.

Apply all 25 migrations from `supabase/MIGRATION_GUIDE.md` first, then run the relevant verification files against the dedicated WRS Supabase project.

| File | When to run | What it verifies |
|---|---|---|
| `plan11_post_migration_checks.sql` | Immediately after all migrations | Critical tables/routines, RLS, append-only/browser privilege boundaries, private storage bucket. |
| `plan11_payment_checks.sql` | After Paystack sandbox/live financial drills | Balanced journals, succeeded-payment entitlement evidence, withdrawal settlement evidence, webhook backlog, reconciliation mismatches, package prices. |
| `plan11_data_checks.sql` | After storage/scanner/privacy drills | Private bucket, scan-before-use, consent/licensing eligibility, deletion queue health, export privacy, browser privileges. |
| `plan11_operational_health.sql` | During staging activation, incident drills and before GO | Stale payment/withdrawal/provider events, reconciliation, privacy/account deletion, urgent support, critical/stale deployment state. |
| `plan11_recovery_fingerprint.sql` | Immediately before and after a controlled recovery drill | Cross-subsystem record/count fingerprint for restore comparison. |
| `plan11_final_go_checks.sql` | Immediately before final GO/promotion | Compact fail-closed finance/privacy/deletion/deployment/support/browser-privilege database gate. |

## Safe use

- Every file begins a read-only transaction and rolls it back.
- The files may raise exceptions intentionally. An exception means **do not promote** until the condition is understood and corrected.
- Do not edit a verification query simply to make a failing environment pass. Fix the authoritative state or add a reviewed query improvement when the rule itself is wrong.
- Record project/environment, release commit, UTC timestamp and result in the release evidence package.
- Never copy secret/service keys, signed URLs, private object content or raw personal/financial data into GitHub evidence.

## Recommended order for a final live review

1. `plan11_post_migration_checks.sql`
2. `plan11_payment_checks.sql`
3. `plan11_data_checks.sql`
4. `plan11_operational_health.sql`
5. `plan11_recovery_fingerprint.sql` when doing recovery comparison
6. `plan11_final_go_checks.sql`

All applicable checks must pass on the same database/release candidate used by `LIVE_EVIDENCE.json`.
