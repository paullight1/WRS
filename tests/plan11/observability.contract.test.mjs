import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.5 provides read-only operational health SQL', async () => {
  const sql = await text('supabase/verification/plan11_operational_health.sql')
  assert.match(sql, /transaction read only/i)
  assert.match(sql, /financial_provider_events/)
  assert.match(sql, /withdrawals/)
  assert.match(sql, /data_deletion_requests/)
  assert.match(sql, /account_deletion_requests/)
  assert.match(sql, /support_tickets/)
  assert.match(sql, /deployment_incidents/)
  assert.match(sql, /verification PASS/)
})

test('Phase 11.5 provides an incident and alert activation runbook', async () => {
  const runbook = await text('Docs/runbooks/LIVE_OBSERVABILITY_ACTIVATION.md')
  assert.match(runbook, /request ID/i)
  assert.match(runbook, /payment/i)
  assert.match(runbook, /reconciliation/i)
  assert.match(runbook, /deletion/i)
  assert.match(runbook, /critical incident/i)
  assert.match(runbook, /alert/i)
  assert.match(runbook, /escalation/i)
  assert.match(runbook, /evidence/i)
})

test('Phase 11.5 records live alert routing as external evidence', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.5-OBSERVABILITY.md')
  assert.match(phase, /structured telemetry/i)
  assert.match(phase, /EXTERNAL BLOCKER/)
  assert.match(phase, /Vercel/i)
  assert.match(phase, /on-call|incident/i)
})
