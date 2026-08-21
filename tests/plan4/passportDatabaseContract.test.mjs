import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../../supabase/migrations/20260821043000_plan4_passport_projection.sql', import.meta.url),
  'utf8',
).toLowerCase()

test('owner passport projection requires server authority and ownership', () => {
  assert.match(source, /wrs_get_robot_passport/)
  assert.match(source, /owner_user_id = p_user_id/)
  assert.match(source, /grant execute[\s\S]*to service_role/)
  assert.match(source, /revoke all[\s\S]*from public, anon, authenticated/)
})

test('owner passport projection assembles verified domain records', () => {
  for (const table of [
    'robot_public_passports',
    'robot_skills',
    'robot_certifications',
    'robot_history_events',
  ]) {
    assert.ok(source.includes(table), `passport projection missing ${table}`)
  }
  assert.match(source, /'authoritative', true/)
})

test('public passport verification excludes owner and financial fields', () => {
  const publicFunction = source.slice(source.indexOf('create or replace function public.wrs_verify_robot_passport'))
  assert.match(publicFunction, /verifiedskills/)
  assert.match(publicFunction, /activecertifications/)
  assert.doesNotMatch(publicFunction, /owner_user_id/)
  assert.doesNotMatch(publicFunction, /wallet|balance|payment|payout/)
  assert.match(publicFunction, /grant execute[\s\S]*to anon, authenticated, service_role/)
})
