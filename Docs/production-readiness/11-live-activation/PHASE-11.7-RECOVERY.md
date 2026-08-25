# Phase 11.7 — Recovery & Rollback Drill

## Goal

Turn WRS recovery from a repository-only backup test into a documented provider-level Supabase recovery and Vercel rollback procedure with measurable RPO/RTO evidence.

## Repository implementation

- Plan 10 Recovery already provides executable PostgreSQL 17 dump/restore evidence for the migration chain.
- Added `supabase/verification/plan11_recovery_fingerprint.sql` to capture a read-only cross-subsystem snapshot/fingerprint before and after a controlled provider recovery.
- Added `Docs/runbooks/LIVE_RECOVERY_ROLLBACK.md` for Supabase backup/PITR restore, post-restore SQL verification, Vercel application rollback and finance/privacy/deployment post-rollback checks.

## Review and improvements

- The live drill freezes synthetic writes before fingerprint capture so differences are meaningful.
- Database migrations are explicitly forward-only: application rollback cannot attempt to reverse financial/identity/privacy/audit migrations in place.
- Provider recovery must run the full post-migration, payment, privacy, operational-health and recovery fingerprint checks before traffic resumes.
- Recovery evidence measures actual RPO/RTO rather than merely recording that a backup exists.
- Rollback verification includes browser/API smoke and duplicate-payment/privacy/deployment settlement protections.

## Classification

**RECOVERY PROCEDURE/SQL READY / EXTERNAL BLOCKER.**

Repository recovery is already proven by Plan 10. The provider-level Supabase backup/PITR restoration, pre/post recovery fingerprint comparison and Vercel staging rollback drill remain `EXTERNAL BLOCKER` evidence for later execution. Live GO is impossible until those drills meet the agreed RPO/RTO and invariant requirements.
