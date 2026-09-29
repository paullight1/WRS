import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const migrationDir = new URL('../../supabase/migrations/', import.meta.url)
const migrationNames = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql'))
const migrationName = migrationNames.find((name) => name.includes('xp_rbc_mining_foundation'))

test('Plan 12 migration establishes protected, append-only mining ledgers and sessions', async (t) => {
  if (!migrationName) {
    assert.fail('missing Supabase migration for XP/RBC mining foundation')
  }
  const sql = await readFile(join(fileURLToPath(migrationDir), migrationName), 'utf8')
  t.diagnostic(`Checking ${migrationName}`)

  for (const table of ['mining_rule_versions', 'mining_power_events', 'mining_sessions', 'mining_economics_config']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}\\b`, 'i'), `${table} exists`)
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`, 'i'),
      `${table} enables RLS`,
    )
  }
  assert.match(
    sql,
    /revoke all on public\.mining_economics_config,[\s\S]*?mining_session_awards from public, anon, authenticated/i,
    'mining tables are not exposed to client roles',
  )

  assert.match(sql, /issuance_enabled\s+boolean\s+not null\s+default\s+false/i)
  assert.match(sql, /unique\s*\(\s*user_id\s*,\s*idempotency_key\s*\)/i)
  assert.match(sql, /session_id uuid primary key/i, 'one financial award reference per session')
  assert.match(
    sql,
    /where\s+status\s+in\s*\(\s*'active'\s*,\s*'ended'\s*\)/i,
    'one active or unsettled session per robot',
  )
  assert.match(sql, /wrs_mining_snapshot\s*\(/i)
  assert.match(sql, /wrs_start_mining_session\s*\(/i)
  assert.match(sql, /wrs_settle_due_mining_session\s*\(/i)
  assert.match(sql, /wrs_admin_save_reward_rule\s*\(/i)
  assert.match(sql, /wrs_admin_set_reward_rule_status\s*\(/i)
  assert.match(sql, /wrs_post_ledger_transaction\s*\(/i, 'settlement delegates to balanced existing ledger')
  assert.match(sql, /before update or delete/i, 'append-only ledgers are protected by triggers')
  assert.match(sql, /issuance_precision_locked/i, 'RBC precision locks after first issuance')
  assert.match(sql, /create trigger mining_power_events_append_only before update or delete/i)
  assert.match(sql, /create trigger mining_session_awards_append_only before update or delete/i)
  assert.match(sql, /create trigger mining_sessions_immutable before update or delete/i)
  assert.match(sql, /create trigger mining_rule_versions_immutable before update or delete/i)
  assert.match(sql, /new\.robot_id is distinct from old\.robot_id[\s\S]*?mining session snapshot is immutable/i)
  assert.match(sql, /unique\s*\(\s*user_id\s*,\s*idempotency_key\s*\)/i)
  assert.match(sql, /where user_id=p_user_id and idempotency_key=p_idempotency_key[\s\S]*?if found then return/i)
  assert.match(sql, /wrs_mining_assert_service_role\(\)/i)
})

test('mining snapshot exposes the owner RBC wallet balance as exact atomic units', async () => {
  const sql = await readFile(join(fileURLToPath(migrationDir), migrationName), 'utf8')
  const snapshot = sql.split('create or replace function public.wrs_mining_snapshot')[1]?.split('$$;')[0] || ''
  assert.match(snapshot, /rbcBalanceAtomic/i)
  assert.match(snapshot, /atomicScale/i)
  assert.match(snapshot, /ledger_entries/i)
  assert.match(snapshot, /ledger_accounts/i)
  assert.match(snapshot, /liability:wallet:/i)
  assert.match(snapshot, /currency\s*=\s*'RBC'/i)
})
