import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('member snapshot returns persisted session metrics and exact RBC balance', async () => {
  const [sql, service, types] = await Promise.all([
    read('supabase/migrations/20260929130000_mining_reporting.sql'),
    read('api/_lib/mining.js'),
    read('src/domain/mining/types.ts'),
  ])
  assert.match(sql, /wrs_mining_summary\(p_user_id uuid\)/i)
  assert.match(sql, /status\s*=\s*'active'[\s\S]*?activeRobots/i)
  assert.match(sql, /miningMilliseconds/i)
  assert.match(sql, /s\.rate_atomic_per_hour::numeric as rate/i)
  assert.match(sql, /sum\(rate\*duration_ms\)/i)
  assert.match(sql, /join public\.ledger_transactions tx on tx\.id=le\.transaction_id and tx\.status='posted'/i)
  assert.match(sql, /availableAtomic/i)
  assert.match(service, /wrs_mining_summary/)
  assert.match(service, /availableAtomic/)
  assert.match(types, /interface MiningSnapshot/)
  assert.match(types, /averageRateAtomicPerHour: string \| null/)
})

test('leaderboard ranks posted, settled mining awards and excludes reversed ledger transactions', async () => {
  const [sql, service, route, types] = await Promise.all([
    read('supabase/migrations/20260929130000_mining_reporting.sql'),
    read('api/_lib/mining.js'),
    read('server/routes/mining/leaderboard.js'),
    read('src/domain/mining/types.ts'),
  ])
  assert.match(sql, /wrs_mining_leaderboard\(p_period text\)/i)
  assert.match(sql, /community_leaderboard_profiles[\s\S]*?opted_in/i)
  assert.match(sql, /ledger_transactions[\s\S]*?status\s*=\s*'posted'/i)
  assert.match(sql, /mining_sessions[\s\S]*?status\s*=\s*'settled'/i)
  assert.match(sql, /p_period='all-time' or a\.created_at >= now\(\)-interval '7 days'/i)
  assert.match(service, /function miningLeaderboard/)
  assert.match(route, /requireSession\(request, \{ verified: true \}\)/)
  assert.match(types, /interface MiningLeaderboardRow/)
  assert.doesNotMatch(service.slice(service.indexOf('export async function miningLeaderboard')), /rbcBalance|wallet/i)
})

test('browser client validates snapshots, starts the selected robot, and loads both leaderboard periods', async () => {
  const client = await read('src/infrastructure/mining/browserMiningClient.ts')
  assert.match(client, /async snapshot\(/)
  assert.match(client, /async start\(input: \{ robotId: string; idempotencyKey: string \}/)
  assert.match(client, /async leaderboard\(/)
  assert.match(client, /credentials:\s*'include'/)
  assert.match(client, /MiningLeaderboardPeriod/)
  assert.doesNotMatch(client, /localStorage|rate:|amount:|elapsedHours/)
})
