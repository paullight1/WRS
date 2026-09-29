import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('mining sessions bind to approved worksites and allow only one open session per member', async () => {
  const sql = await read('supabase/migrations/20260929120000_mining_robot_worksite_unlocks.sql')
  assert.match(sql, /create table public\.mining_worksites/i)
  assert.match(sql, /status text not null default 'pending'.*approved/i)
  assert.match(sql, /alter table public\.mining_sessions\s+add column worksite_id uuid/i)
  assert.match(sql, /worksite_id uuid references public\.mining_worksites/i)
  assert.match(sql, /create unique index mining_sessions_one_open_per_user_idx[\s\S]*?on public\.mining_sessions\(user_id\)[\s\S]*?where status in \('active','ended'\)/i)
})

test('start RPC checks selected robot ownership, lifecycle, sequential unlock, and approved worksite', async () => {
  const sql = await read('supabase/migrations/20260929120000_mining_robot_worksite_unlocks.sql')
  assert.match(sql, /wrs_start_mining_session\(\s*p_user_id uuid, p_robot_id uuid, p_worksite_id uuid, p_idempotency_key text\s*\)/i)
  assert.match(sql, /id\s*=\s*p_robot_id and owner_user_id\s*=\s*p_user_id/i)
  assert.match(sql, /robot lifecycle must be active/i)
  assert.match(sql, /settled mining session required to unlock this robot/i)
  assert.match(sql, /status\s*=\s*'approved'[\s\S]*?id\s*=\s*p_worksite_id/i)
  assert.match(sql, /grant execute on function public\.wrs_start_mining_session\(uuid,uuid,uuid,text\) to service_role/i)
})

test('start request accepts only UUID robot/worksite IDs and a bounded idempotency key', async () => {
  const { validateMiningStartBody } = await import(new URL('../../api/_lib/mining.js', import.meta.url))
  const robotId = '123e4567-e89b-42d3-a456-426614174000'
  const worksiteId = '123e4567-e89b-42d3-a456-426614174001'
  assert.deepEqual(validateMiningStartBody({ robotId, worksiteId, idempotencyKey: 'mining-cycle-0001' }), {
    robotId,
    worksiteId,
    idempotencyKey: 'mining-cycle-0001',
  })
  for (const input of [
    {},
    { robotId, worksiteId, idempotencyKey: 'short' },
    { robotId: 'not-a-uuid', worksiteId, idempotencyKey: 'mining-cycle-0001' },
    { robotId, worksiteId, idempotencyKey: 'mining-cycle-0001', amount: 10 },
  ]) {
    assert.throws(() => validateMiningStartBody(input), { name: 'HttpError' })
  }
})

test('snapshot and start routes require a verified member session', async () => {
  const [snapshot, start] = await Promise.all([read('api/mining.js'), read('api/mining/start.js')])
  assert.match(snapshot, /requireSession\(request, \{ verified: true \}\)/)
  assert.match(start, /requireSession\(request, \{ verified: true \}\)/)
  assert.match(start, /assertSameOrigin\(request\)/)
})
