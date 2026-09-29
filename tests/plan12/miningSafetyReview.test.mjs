import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('service role has read-only table access and writes only through verified definer RPCs', async () => {
  const sql = await read('supabase/migrations/20260926092033_xp_rbc_mining_foundation.sql')
  assert.match(
    sql,
    /revoke all on public\.mining_economics_config,[\s\S]*?from public, anon, authenticated, service_role/i,
  )
  assert.match(sql, /grant select on public\.mining_economics_config,[\s\S]*?to service_role/i)
  assert.match(sql, /wrs_start_mining_session\(p_user_id uuid, p_idempotency_key text\)[\s\S]*?security definer/i)
  assert.match(sql, /wrs_settle_due_mining_session\(p_user_id uuid\)[\s\S]*?security definer/i)
  assert.match(sql, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/i)
})

test('active rule precision is pinned and must match the immutable RBC scale', async () => {
  const sql = await read('supabase/migrations/20260926092033_xp_rbc_mining_foundation.sql')
  assert.match(
    sql,
    /create table public\.mining_rule_versions[\s\S]*?atomic_scale integer check \(atomic_scale between 0 and 12\)/i,
  )
  assert.match(sql, /v_economics\.atomic_scale is distinct from v_rule\.atomic_scale/i)
  assert.match(
    sql,
    /new\.atomic_scale is distinct from old\.atomic_scale[\s\S]*?mining rule version configuration is immutable/i,
  )
  assert.match(sql, /'atomicUnitScale',v_rule\.atomic_scale/i)
})

test('settlement serializes against and enforces the one-time global issuance cap', async () => {
  const sql = await read('supabase/migrations/20260926092033_xp_rbc_mining_foundation.sql')
  assert.match(sql, /global_issuance_cap_atomic bigint/i)
  assert.match(sql, /from public\.mining_economics_config where singleton for update/i)
  assert.match(sql, /sum\(a\.amount_atomic\)[\s\S]*?global_issuance_cap_atomic/i)
  assert.match(sql, /global issuance cap and precision are required/i)
  assert.match(
    sql,
    /global_issuance_cap_atomic is distinct from old\.global_issuance_cap_atomic[\s\S]*?global issuance cap is locked after first award/i,
  )
})
