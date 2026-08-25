# Phase 11.2 — Repository governance

## Goal
Make bypass of certified release gates impossible through normal repository operations.

## Required controls
Protect `main`; require Quality, Plan 10 Security/Launch and Recovery checks; block direct pushes; require reviewed PRs; keep production promotion tied to a reviewed release commit.

## Exit gate
GitHub ruleset/branch-protection evidence is recorded in the evidence matrix.

## Current evidence
External blocker: the connected GitHub action surface does not expose branch-protection/ruleset mutation.