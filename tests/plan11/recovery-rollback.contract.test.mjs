import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.7 provides read-only recovery fingerprint SQL', async () => {
  const sql = await text('supabase/verification/plan11_recovery_fingerprint.sql')
  assert.match(sql, /transaction read only/i)
  assert.match(sql, /jsonb_build_object/)
  assert.match(sql, /user_profiles/)
  assert.match(sql, /ledger_transactions/)
  assert.match(sql, /data_assets/)
  assert.match(sql, /deployments/)
  assert.match(sql, /operations_audit_events/)
  assert.match(sql, /checksum|fingerprint/i)
})

test('Phase 11.7 runbook covers Supabase PITR and Vercel rollback', async () => {
  const runbook = await text('Docs/runbooks/LIVE_RECOVERY_ROLLBACK.md')
  assert.match(runbook, /PITR|point-in-time/i)
  assert.match(runbook, /Supabase/i)
  assert.match(runbook, /Vercel/i)
  assert.match(runbook, /rollback/i)
  assert.match(runbook, /fingerprint/i)
  assert.match(runbook, /ledger/i)
  assert.match(runbook, /RTO/i)
  assert.match(runbook, /RPO/i)
})

test('Phase 11.7 records provider recovery evidence as external', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.7-RECOVERY.md')
  assert.match(phase, /Plan 10 Recovery/i)
  assert.match(phase, /EXTERNAL BLOCKER/)
  assert.match(phase, /provider/i)
  assert.match(phase, /rollback drill/i)
})
