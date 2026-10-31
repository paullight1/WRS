import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('new mining sessions last six hours without invalidating older sessions', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20261031124121_mining_six_hour_cycles.sql', import.meta.url),
    'utf8',
  )
  assert.match(sql, /ends_at = started_at \+ interval '24 hours' or ends_at = started_at \+ interval '6 hours'/i)
  assert.match(
    sql,
    /values\(p_user_id,v_robot\.id,p_worksite_id,p_idempotency_key,v_rule\.id,v_rule\.version,now\(\),now\(\)\+interval '6 hours'/i,
  )
  assert.match(sql, /perUserDailyCapAtomic/)
  assert.match(
    sql,
    /grant execute on function public\.wrs_start_mining_session\(uuid,uuid,uuid,text\) to service_role/i,
  )
})
