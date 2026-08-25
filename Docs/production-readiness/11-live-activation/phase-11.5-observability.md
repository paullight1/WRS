# Phase 11.5 — Live observability and incident exercise

## Goal
Prove production-like telemetry reaches a real monitoring destination and pages a named responder.

## Required scenarios
Synthetic auth failure, upstream timeout, payment/provider failure, deletion-worker failure and ledger/reconciliation anomaly generate redacted structured telemetry with request IDs and actionable alerts.

## Exit gate
Alert destination, acknowledgement time, escalation owner and incident drill record are evidence-backed PASS.