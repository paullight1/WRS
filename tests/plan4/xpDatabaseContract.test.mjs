import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../../supabase/migrations/20260821042000_plan4_xp_projection_hardening.sql', import.meta.url),
  'utf8',
).toLowerCase()

test('database prevents duplicate XP for the same verified source under a different idempotency key', () => {
  assert.match(source, /robot_xp_events_source_reference_idx/)
  assert.match(source, /source = p_event->>'source'/)
  assert.match(source, /reference_type = p_event->>'referencetype'/)
  assert.match(source, /reference_id = p_event->>'referenceid'/)
})

test('passport XP and level are refreshed from the append-only ledger', () => {
  assert.match(source, /sum\(amount\)/)
  assert.match(source, /update public\.robot_public_passports/)
  assert.match(source, /total_xp = v_total/)
  assert.match(source, /wrs_robot_level_for_xp/)
})

test('XP hardening function remains service-role only', () => {
  assert.match(source, /revoke all[\s\S]*from public, anon, authenticated/)
  assert.match(source, /grant execute[\s\S]*to service_role/)
})
