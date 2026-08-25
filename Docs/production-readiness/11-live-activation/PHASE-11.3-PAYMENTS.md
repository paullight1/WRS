# Phase 11.3 — Payment Sandbox Validation

## Goal

Prove the WRS financial path against Paystack test infrastructure without allowing staging to use live payment credentials or allowing browser state to become financial authority.

## Repository implementation

- `scripts/paystack-sandbox-smoke.mjs` accepts only `PAYSTACK_TEST_SECRET_KEY` keys beginning with `sk_test_`.
- `.github/workflows/plan11-payment-sandbox.yml` is manual (`workflow_dispatch`) and reads only the dedicated staging test-key secret and staging URL.
- `api/_lib/paystack.js` now uses the shared upstream timeout and redacted structured telemetry boundary instead of raw `fetch`/raw console transport logging.
- `supabase/verification/plan11_payment_checks.sql` performs read-only ledger/payment/withdrawal/webhook/reconciliation consistency checks.

## Evidence sequence to run later

1. Configure the staging environment with a Paystack test secret key only.
2. Run **Plan 11 Payment Sandbox Validation** to prove provider connectivity and transaction initialization.
3. Use the deployed WRS staging checkout path to create an authoritative payment intent.
4. Complete that test transaction using Paystack's currently documented sandbox payment method.
5. Confirm Paystack delivers the signed webhook to `/api/payments/webhook` and WRS processes it once.
6. Verify the payment intent becomes `succeeded`, exactly one balanced settlement journal exists, and the corresponding package entitlement is active.
7. Replay the same webhook/event and verify idempotency prevents a second economic posting.
8. Exercise a sandbox refund/reversal and prove the compensating journal/entitlement behavior.
9. Exercise the staging withdrawal path where the Paystack account supports test transfers; verify reservation, provider-pending, success/failure/reversal and available-balance projections.
10. Run `/api/payments/reconcile` through the authorized server/operator path and confirm provider/local state matches.
11. Run `supabase/verification/plan11_payment_checks.sql` against staging.
12. Save the provider references, relevant WRS transaction IDs, workflow run ID and reconciliation result in the release evidence package. Do not store secret keys or full bank/card data.

## Review and improvements

- Sandbox credentials have no fallback to `PAYSTACK_SECRET_KEY` in the manual validation workflow.
- The smoke script refuses non-test keys before making network requests.
- Provider calls now inherit timeout behavior and redacted telemetry from Plan 10.
- Verification SQL fails on unbalanced journals, succeeded payments without settlement/entitlement evidence, succeeded withdrawals without provider/ledger evidence, stale unprocessed webhooks and recent reconciliation mismatches.
- Provider webhook idempotency remains an authoritative database concern rather than a browser concern.

## Classification

**SANDBOX TOOLING READY / EXTERNAL BLOCKER.**

The payment implementation and verification tooling are ready. Actual sandbox initialization, completed payment, signed webhook, refund/reversal, withdrawal (where supported) and reconciliation evidence require a real Paystack test key and deployed staging callback URL. Until those are recorded, live payments and withdrawals remain `EXTERNAL BLOCKER` and production activation remains NO-GO.
