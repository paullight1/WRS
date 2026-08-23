# Phase 11.1 — Dedicated staging/production infrastructure

## Goal
Provision WRS-owned staging and production services with isolated credentials and synthetic staging data.

## Exit gate
Dedicated WRS Supabase staging/production projects and the correct WRS Vercel team/project are accessible; secrets are environment-scoped; migrations apply cleanly; staging contains no production customer data.

## Current evidence
Blocked externally: Supabase creation requires explicit organization selection; connected Vercel account does not expose the team that owns the existing WRS deployment.