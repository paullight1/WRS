# WRS Live Observability & Incident Activation Runbook

This runbook is for the future dedicated WRS staging/production deployment. It defines what must be observable and exercised before live activation can be classified GO.

## Telemetry baseline

WRS server functions already emit structured events through the shared telemetry boundary. Every live request should be traceable with a **request ID/correlation ID** without logging passwords, cookies, tokens, email, phone, financial values or biometric/private-data payloads.

For staging and production, route runtime logs to the selected monitoring/on-call destination and preserve enough metadata to identify:

- environment and deployment/commit;
- route family/function;
- request ID;
- event name/severity;
- upstream/provider name where applicable;
- redacted error class/message;
- duration/status information.

## Minimum alert conditions

Create alerts for at least these conditions:

1. **Authentication abuse / rate limiting** — sustained login/OTP/MFA limit violations or unusual unauthorized patterns.
2. **Payment/webhook failures** — Paystack transport timeout/unreachable, rejected provider calls, signature rejection spikes, stale unprocessed provider events.
3. **Financial reconciliation mismatch** — any recent `financial_reconciliations.matched=false`.
4. **Withdrawal backlog** — reserved/provider-pending withdrawals exceeding the documented operational threshold.
5. **Sensitive-data scanning** — scanner callback failures, infected findings, or submissions attempting to progress without `scan_status=clean`.
6. **Privacy deletion** — processing deletion jobs stuck beyond threshold, retry exhaustion, storage deletion failures.
7. **Account deletion** — stuck/failed finalization jobs or identity-provider redaction failures.
8. **Deployment operations** — critical deployment incident, stale active deployment, failed settlement/verification workflows.
9. **Application/server errors** — elevated 5xx, upstream timeout/unreachable, repeated function exceptions.
10. **Security indicators** — suspicious operator/admin activity, repeated step-up/MFA failures or forbidden internal-endpoint access.

## Alert-routing drill

For each configured production-critical alert:

1. Trigger the safe staging simulation documented for that condition.
2. Record the WRS request ID and UTC trigger time.
3. Confirm the monitoring system receives the matching structured event.
4. Confirm the alert reaches the named on-call/escalation destination.
5. Confirm the receiver acknowledges the alert.
6. Confirm the runbook link/context identifies the owning subsystem and next diagnostic query.
7. Record time-to-detection and time-to-acknowledgement.
8. Close the alert and confirm recovery/clear notification where applicable.

Do not generate real financial loss, real malicious payloads or production-user privacy events for the drill. Use staging/synthetic records and supported provider simulations.

## Incident drill

Run one cross-system staging incident before GO. Recommended scenario:

**Provider outage + queued financial event**

- Simulate the payment provider being unreachable or timing out.
- Confirm the WRS request fails closed and returns no fake success.
- Confirm structured telemetry contains the request ID and provider outage event without secret/PII leakage.
- Confirm an alert fires and reaches on-call.
- Confirm no duplicate ledger transaction or package entitlement is created.
- Restore provider connectivity.
- Re-run/reconcile through the authoritative flow and verify the ledger remains balanced/idempotent.

The incident commander should record the timeline, diagnosis, remediation and whether rollback was considered/required.

## Database operational check

Run:

`supabase/verification/plan11_operational_health.sql`

It is read-only and fails if it detects stale financial events, withdrawal/reconciliation problems, stuck deletion jobs, urgent support backlog, recent critical deployment incidents or stale active deployment state.

## Evidence package

Keep:

- release commit/deployment ID;
- monitoring destination name (not credentials);
- alert rule names/IDs;
- trigger request IDs;
- alert timestamps;
- acknowledgement timestamps;
- incident drill report;
- operational-health SQL result/timestamp;
- named on-call owner and escalation path.

Never store raw auth tokens, cookies, bank/card data, private user content or secret values in incident evidence.

## Fail-closed rule

Production activation remains **NO-GO** if critical alerts are not routed, no human/on-call acknowledgement path exists, operational-health SQL fails, or the incident drill shows an uncontained P0/P1 failure mode.
