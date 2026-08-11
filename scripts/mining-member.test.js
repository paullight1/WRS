import test from 'node:test'
import assert from 'node:assert/strict'
import {
  activityStatus,
  createMiningApi,
  leaderboardCategories,
  normalizeEventCode,
  normalizeAnalyticsPeriod,
} from '../src/lib/miningApi.js'

test('claims a completed mission through its scoped member endpoint', async () => {
  const calls = []
  const api = createMiningApi({
    get: async () => null,
    post: async (path, body, options) => {
      calls.push({ path, body, options })
      return { account: { availableRbc: 25 }, mission: { id: 'voice-samples', status: 'Claimed' } }
    },
    makeIdempotencyKey: () => 'claim-key',
  })

  const receipt = await api.claimMission('voice-samples')

  assert.equal(receipt.mission.status, 'Claimed')
  assert.deepEqual(calls, [{
    path: '/mining/missions/voice-samples/claim',
    body: {},
    options: { idempotencyKey: 'claim-key' },
  }])
})

test('activates a named boost through a server-confirmed mutation', async () => {
  const calls = []
  const api = createMiningApi({
    get: async () => null,
    post: async (path, body, options) => {
      calls.push({ path, body, options })
      return { activeBoosts: [{ boostId: 'speed' }] }
    },
    makeIdempotencyKey: () => 'boost-key',
  })

  const receipt = await api.activateBoost('speed')

  assert.equal(receipt.activeBoosts[0].boostId, 'speed')
  assert.equal(calls[0].path, '/mining/boosts/speed/activate')
  assert.equal(calls[0].options.idempotencyKey, 'boost-key')
})

test('normalizes a valid event code and rejects malformed codes before submission', () => {
  assert.equal(normalizeEventCode(' wrs-847 219 '), 'WRS847219')
  assert.throws(() => normalizeEventCode('no!'), /six to thirty.*event code/i)
})

test('loads analytics only for an allowed period', async () => {
  const paths = []
  const api = createMiningApi({
    get: async (path) => { paths.push(path); return { period: 'month', earnings: [] } },
    post: async () => null,
    makeIdempotencyKey: () => 'unused',
  })

  await api.getAnalytics('month')

  assert.deepEqual(paths, ['/mining/analytics?period=month'])
  assert.equal(normalizeAnalyticsPeriod('day'), 'day')
  assert.throws(() => normalizeAnalyticsPeriod('week'), /analytics period/i)
})

test('labels reward activity with its server status rather than inferring success', () => {
  assert.deepEqual(activityStatus('pending'), { label: 'Pending validation', tone: 'gold' })
  assert.deepEqual(activityStatus('approved'), { label: 'Approved', tone: 'success' })
  assert.deepEqual(activityStatus('rejected'), { label: 'Rejected', tone: 'error' })
  assert.deepEqual(activityStatus('claimed'), { label: 'Claimed', tone: 'tertiary' })
})

test('scopes leaderboard requests to a supported category', async () => {
  const paths = []
  const api = createMiningApi({
    get: async (path) => { paths.push(path); return { category: 'contributors', entries: [] } },
    post: async () => null,
    makeIdempotencyKey: () => 'unused',
  })

  await api.getLeaderboard('contributors')

  assert.deepEqual(paths, ['/mining/leaderboard?category=contributors'])
  assert.deepEqual(leaderboardCategories, ['miners', 'contributors', 'validators', 'ambassadors', 'referrers', 'cities', 'countries'])
  assert.throws(() => api.getLeaderboard('all-users'), /leaderboard category/i)
})
