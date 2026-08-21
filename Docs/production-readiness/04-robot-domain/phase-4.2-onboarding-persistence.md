# Phase 4.2 — Onboarding Persistence

## Goal
Make the six-step onboarding flow create a durable robot instead of discarding user choices after navigation.

## Implementation
- Persist package selection, robot name, appearance and personality through a server-side onboarding transaction.
- Validate names, package entitlement and allowed configuration values.
- Resume safely after interruption without duplicating robots.
- Provision robot ID/passport state only when prerequisites are genuinely satisfied.
- Distinguish unpaid package selection from activated entitlement.

## Tests / Evidence
- Refresh/log out/in during onboarding resumes correctly.
- Repeated final submission creates one robot only.
- Invalid/unpaid package state cannot create an active paid-tier robot.

## Exit gate
A completed onboarding session produces exactly one persisted robot whose state is reproduced on another device/session.