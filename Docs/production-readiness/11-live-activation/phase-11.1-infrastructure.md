# Phase 11.1 — Dedicated staging/production infrastructure

## Goal
Provision WRS-owned staging and production services with isolated credentials and synthetic staging data.

## Exit gate
Dedicated WRS Supabase staging/production projects and the correct WRS Vercel team/project are accessible; secrets are environment-scoped; migrations apply cleanly; staging contains no production customer data.

## Current evidence

**Status: SQL/REPOSITORY READY — MANUAL LIVE APPLICATION PENDING — NO-GO.**

The complete 25-file SQL migration pack has been applied and verified against the dedicated development Supabase project. This proves the repository migration chain, but it does not promote that project to staging or production and does not replace the required environment-isolation review.

Vercel activation remains an external blocker. The earlier connected `crescivacapital` Vercel view exposed zero projects, while the currently authenticated CLI account exposes projects but no WRS project is locally linked or unambiguously mapped to this repository. Production deployment, environment-scoped secrets, and rollback evidence must remain pending until the owning Vercel team/project is identified and verified.
