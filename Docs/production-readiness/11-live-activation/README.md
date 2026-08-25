# Plan 11 — WRS Live Production Activation Package

This directory is the handoff for activating the code-side production-ready WRS system against real infrastructure later. No unrelated Supabase/Vercel project is reused, and no external blocker is treated as PASS without evidence.

## Phase index

| Phase | Repository status | Key handoff |
|---|---|---|
| 11.1 Production infrastructure | SQL/repository ready | `supabase/MIGRATION_GUIDE.md`, `.env.live.example`, live preflight, post-migration verification SQL |
| 11.2 Repository governance | Policy ready | `CODEOWNERS`, production release checklist; GitHub branch protection still manual/external |
| 11.3 Payment sandbox | Tooling ready | Paystack sandbox workflow/script + `plan11_payment_checks.sql` |
| 11.4 Sensitive data | SQL/runbook ready | private storage migration, `plan11_data_checks.sql`, sensitive-data activation runbook |
| 11.5 Observability/incidents | SQL/runbook ready | `plan11_operational_health.sql`, alert/incident runbook |
| 11.6 Staging validation | Remote harness ready | staging HTTP preflight + remote Playwright workflow/config/spec |
| 11.7 Recovery/rollback | SQL/runbook ready | recovery fingerprint SQL + Supabase PITR/Vercel rollback runbook |
| 11.8 Human launch review | Review template ready | `Docs/releases/HUMAN_LAUNCH_REVIEW.md` |
| 11.9 Final GO gate | Fail-closed evaluator ready | evidence JSON schema, evaluator workflow/script + final database GO SQL |
| 11.10 Merge/activation | Activation sequence ready | stacked PR merge/promotion/rollback procedure |

## Supabase SQL

Migrations: **25 files**, timestamp ordered under `supabase/migrations/`.

Do not invent a new order. Follow `supabase/MIGRATION_GUIDE.md` exactly.

Read-only activation checks are indexed in `supabase/verification/README.md`.

## Current decision

**LIVE RELEASE: NO-GO.**

This repository package is designed so you can add the real Supabase/Vercel/Paystack/scanner/monitoring configuration later. Until the live evidence template is completed with real PASS evidence and the final evaluators pass, PR #7 and PR #3 must remain unmerged for production activation.
