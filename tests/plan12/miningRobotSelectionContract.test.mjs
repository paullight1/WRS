import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('mining sessions allow a robot-only cycle while retaining optional worksite history', async () => {
  const sql = await read('supabase/migrations/20261001080216_configurable_xp_rbc_reward_rules.sql')
  const api = await read('api/_lib/mining.js')
  assert.match(sql, /p_user_id uuid,\s*p_robot_id uuid,\s*p_worksite_id uuid,\s*p_idempotency_key text/i)
  assert.match(sql, /if p_worksite_id is not null and not exists[\s\S]*?approved worksite required/i)
  assert.doesNotMatch(sql, /p_user_id is null or p_robot_id is null or p_worksite_id is null/)
  assert.match(api, /p_worksite_id:\s*null/)
  assert.match(api, /wrs_start_mining_session/)
})

test('mining start validates robot ownership at the server and accepts only a robot plus idempotency key', async () => {
  const { validateMiningStartBody } = await import(new URL('../../api/_lib/mining.js', import.meta.url))
  const robotId = '123e4567-e89b-42d3-a456-426614174000'
  assert.deepEqual(validateMiningStartBody({ robotId, idempotencyKey: 'mining-cycle-0001' }), {
    robotId,
    idempotencyKey: 'mining-cycle-0001',
  })
  for (const input of [
    {},
    { robotId, idempotencyKey: 'short' },
    { robotId: 'not-a-uuid', idempotencyKey: 'mining-cycle-0001' },
    { robotId, worksiteId: '123e4567-e89b-42d3-a456-426614174001', idempotencyKey: 'mining-cycle-0001' },
    { robotId, idempotencyKey: 'mining-cycle-0001', amount: 10 },
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
