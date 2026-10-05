# Phase 11.1 — Dedicated staging/production infrastructure

## Goal

Provision WRS-owned staging and production services with isolated credentials and synthetic staging data.

## Exit gate

Dedicated WRS Supabase staging/production projects and the correct WRS Vercel team/project are accessible; secrets are environment-scoped; migrations apply cleanly; staging contains no production customer data.

## Current evidence

**Status: STAGING DATABASE READY — PRODUCTION INFRASTRUCTURE PENDING — NO-GO.**

The evidence recorded 33 SQL migrations applied to the new WRS staging project `zaujrbcvgargyabebjyj` in `eu-central-1` on PostgreSQL 17.11, with the read-only post-migration check passing. The repository now has a 34th migration for audited operator-role management; this work did not apply it to any Supabase project. Reconcile and apply that migration on the exact staging candidate before considering production. The separate WRS development project remains on PostgreSQL 17.6 with 31 applied migrations and is not used as staging or production.

The WRS Supabase organization is on the Free plan and now has its two active free projects (development and staging). Free projects may pause after inactivity and do not include automatic backups. Production requires a paid plan; Supabase Pro starts at $25/month before any additional compute or usage charges ([current pricing](https://supabase.com/pricing), [free-project limits](https://supabase.com/docs/guides/platform/billing-on-supabase)).

Vercel activation remains an external blocker: the current connected Vercel team returns zero projects. Production deployment, environment-scoped secrets, production database provisioning, and rollback evidence remain pending.
