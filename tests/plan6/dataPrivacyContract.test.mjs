import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const required = [
  'src/domain/data/consent.ts',
  'src/domain/data/quality.ts',
  'src/services/data/DataService.ts',
  'api/_lib/data.js',
  'api/_lib/storage.js',
  'api/data/consent.js',
  'api/data/upload-grant.js',
  'api/data/submissions.js',
  'api/data/delete.js',
  'api/data/delete/process.js',
  'api/data/export.js',
  'api/data/revenue.js',
  'api/data/licenses/distribute.js',
  'supabase/migrations/20260822060000_plan6_data_privacy.sql',
  'supabase/migrations/20260822063000_plan6_deletion_queue.sql',
]

test('Plan 6 has authoritative consent, data, storage and lifecycle boundaries', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('consent is versioned, purpose-scoped and append-only', () => {
  const sql = read('supabase/migrations/20260822060000_plan6_data_privacy.sql').toLowerCase()
  for (const table of ['consent_purposes', 'consent_versions', 'consent_events', 'data_assets', 'data_submissions']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  }
  assert.match(sql, /consent_events_append_only/)
  assert.match(sql, /wrs_has_active_consent/)
  assert.match(sql, /purpose_slug/)
  assert.match(sql, /version/)
  assert.match(sql, /withdraw/)
})

test('sensitive upload grants require active consent and server-owned object paths', () => {
  const upload = read('api/data/upload-grant.js')
  const storage = read('api/_lib/storage.js')
  assert.match(upload, /requireSession/)
  assert.match(upload, /wrs_has_active_consent/)
  assert.match(upload, /mime|contentType/i)
  assert.match(upload, /size/i)
  assert.doesNotMatch(upload, /body\.path|body\.bucket/)
  assert.match(storage, /signed/i)
  assert.doesNotMatch(storage, /VITE_.*SECRET|localStorage/)
})

test('data lifecycle is explicit and unscanned files cannot become approved/licensable', () => {
  const sql = read('supabase/migrations/20260822060000_plan6_data_privacy.sql').toLowerCase()
  assert.match(sql, /draft.*submitted.*processing.*review.*approved.*rejected.*deleted/s)
  assert.match(sql, /scan_status/)
  assert.match(sql, /clean/)
  assert.match(sql, /wrs_submit_data_asset/)
  assert.match(sql, /wrs_review_data_submission/)
})

test('quality scoring is deterministic and cannot be client-authoritative', () => {
  const quality = read('src/domain/data/quality.ts')
  const submissions = read('api/data/submissions.js')
  assert.match(quality, /completeness/i)
  assert.match(quality, /accuracy/i)
  assert.match(quality, /consistency/i)
  assert.match(quality, /agreement/i)
  assert.match(submissions, /wrs_submit_data_asset/)
  assert.doesNotMatch(submissions, /body\.qualityScore|body\.approved/)
})

test('deletion is queued until signed upload grants expire and storage deletion succeeds', () => {
  const queue = read('supabase/migrations/20260822063000_plan6_deletion_queue.sql').toLowerCase()
  const endpoint = read('api/data/delete.js')
  const worker = read('api/data/delete/process.js')
  const data = read('api/_lib/data.js')
  assert.match(queue, /eligible_at/)
  assert.match(queue, /interval '2 hours'/)
  assert.match(queue, /for update skip locked/)
  assert.match(queue, /wrs_claim_next_data_deletion/)
  assert.match(queue, /account data deletion is in progress/)
  assert.match(endpoint, /status: 'requested'/)
  assert.match(endpoint, /202/)
  assert.doesNotMatch(endpoint, /status: 'completed'/)
  assert.match(worker, /deletePrivateObject/)
  assert.match(worker, /completeDeletion/)
  assert.match(data, /offset=/)
  assert.match(data, /pageSize = 500/)
})

test('deletion and export have durable request/audit state', () => {
  const sql = read('supabase/migrations/20260822060000_plan6_data_privacy.sql').toLowerCase()
  assert.match(sql, /data_deletion_requests/)
  assert.match(sql, /data_export_requests/)
  assert.match(sql, /wrs_request_data_deletion/)
  assert.match(sql, /wrs_prepare_data_export/)
  assert.match(read('api/data/delete.js'), /assertSameOrigin/)
  assert.match(read('api/data/export.js'), /requireSession/)
})

test('dataset licensing requires consent and approved clean items', () => {
  const sql = read('supabase/migrations/20260822060000_plan6_data_privacy.sql').toLowerCase()
  for (const table of ['datasets', 'dataset_items', 'dataset_licenses', 'contributor_allocations']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  }
  assert.match(sql, /research-licensing/)
  assert.match(sql, /status='approved'|status = 'approved'/)
  assert.match(sql, /scan_status='clean'|scan_status = 'clean'/)
})

test('commercial data distributions settle contributor value through the Plan 5 ledger', () => {
  const sql = read('supabase/migrations/20260822060000_plan6_data_privacy.sql').toLowerCase()
  const distribute = read('api/data/licenses/distribute.js')
  assert.match(sql, /wrs_distribute_dataset_license/)
  assert.match(sql, /wrs_post_ledger_transaction/)
  assert.match(sql, /liability:wallet:/)
  assert.match(distribute, /wrs_distribute_dataset_license/)
})
