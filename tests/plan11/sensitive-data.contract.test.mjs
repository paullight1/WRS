import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.4 includes read-only sensitive-data verification SQL', async () => {
  const sql = await text('supabase/verification/plan11_data_checks.sql')
  assert.match(sql, /transaction read only/i)
  assert.match(sql, /storage\.buckets/)
  assert.match(sql, /scan_status/)
  assert.match(sql, /consent_events/)
  assert.match(sql, /data_deletion_requests/)
  assert.match(sql, /dataset_licenses/)
  assert.match(sql, /data_export_requests/)
  assert.match(sql, /verification PASS/)
})

test('Phase 11.4 documents scanner, deletion, export and licensing activation drills', async () => {
  const runbook = await text('Docs/runbooks/SENSITIVE_DATA_ACTIVATION.md')
  assert.match(runbook, /private bucket/i)
  assert.match(runbook, /scanner/i)
  assert.match(runbook, /infected/i)
  assert.match(runbook, /deletion worker/i)
  assert.match(runbook, /export/i)
  assert.match(runbook, /licens/i)
  assert.match(runbook, /consent/i)
  assert.match(runbook, /evidence/i)
})

test('Phase 11.4 explicitly records that no new base migration is required', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.4-SENSITIVE-DATA.md')
  assert.match(phase, /no new base migration/i)
  assert.match(phase, /20260822060000_plan6_data_privacy\.sql/)
  assert.match(phase, /20260825010000_plan11_storage_activation\.sql/)
  assert.match(phase, /EXTERNAL BLOCKER/)
})

test('Phase 11.4 keeps direct private storage access server mediated', async () => {
  const storage = await text('api/_lib/storage.js')
  assert.match(storage, /createSignedUploadGrant/)
  assert.match(storage, /createSignedDownloadUrl/)
  assert.match(storage, /deletePrivateObject/)
  const migration = await text('supabase/migrations/20260825010000_plan11_storage_activation.sql')
  assert.match(migration, /public\s*=\s*false|public,\s*file_size_limit/s)
  assert.doesNotMatch(migration, /create policy[\s\S]*authenticated/i)
})
