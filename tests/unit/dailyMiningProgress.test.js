import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aggregateDailyMining, miningDailyProgress } from '../../api/_lib/miningProgress.js'
import { serviceRest } from '../../api/_lib/supabase.js'

vi.mock('../../api/_lib/supabase.js', () => ({ serviceRest: vi.fn() }))

const now = Date.parse('2026-11-03T03:00:00Z')
const session = (id, started_at, ends_at, status = 'settled') => ({ id, started_at, ends_at, status })

describe('daily mining progress', () => {
  beforeEach(() => vi.clearAllMocks())

  it('splits recorded mining across UTC midnight and counts a cycle on its completion day', () => {
    const result = aggregateDailyMining([session('one', '2026-11-02T22:00:00Z', '2026-11-03T02:00:00Z')], now)
    expect(result.days).toHaveLength(7)
    expect(result.days.at(-2)).toMatchObject({ day: '2026-11-02', miningMilliseconds: 7200000, completedCycles: 0 })
    expect(result.days.at(-1)).toMatchObject({ day: '2026-11-03', miningMilliseconds: 7200000, completedCycles: 1 })
  })

  it('counts only elapsed mining, excludes cancelled sessions, and does not double count overlap', () => {
    const result = aggregateDailyMining(
      [
        session('active', '2026-11-03T01:00:00Z', '2026-11-03T07:00:00Z', 'active'),
        session('duplicate-interval', '2026-11-03T01:00:00Z', '2026-11-03T07:00:00Z', 'active'),
        session('cancelled', '2026-11-03T00:00:00Z', '2026-11-03T06:00:00Z', 'cancelled'),
      ],
      now,
    )
    expect(result.days.at(-1)).toMatchObject({ miningMilliseconds: 7200000, completedCycles: 0 })
  })

  it('scopes the database read to the authenticated member and rejects invalid IDs before querying', async () => {
    serviceRest.mockResolvedValue({ data: [] })
    const userId = '11111111-1111-4111-8111-111111111111'
    await miningDailyProgress(userId, now)
    const query = serviceRest.mock.calls[0][0]
    expect(query).toContain(`user_id=eq.${userId}`)
    expect(query).toContain('ends_at=gte.')
    expect(query).toContain('started_at=lt.')
    await expect(miningDailyProgress('other-user')).rejects.toThrow('Authentication is required')
    expect(serviceRest).toHaveBeenCalledTimes(1)
  })

  it('does not turn truncated or invalid records into a misleading complete report', async () => {
    serviceRest.mockResolvedValue({ data: Array.from({ length: 1000 }, () => ({})) })
    await expect(miningDailyProgress('11111111-1111-4111-8111-111111111111', now)).rejects.toThrow()
    expect(() => aggregateDailyMining([session('bad', 'invalid', '2026-11-03T02:00:00Z')], now)).toThrow()
  })
})
