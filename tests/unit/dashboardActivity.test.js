import { describe, expect, it } from 'vitest'
import { dashboardActivity, activityAmount } from '../../src/components/dashboard/dashboardActivity.js'

describe('dashboard account activity', () => {
  it('combines actual XP, RBC and cash records in newest-first order without duplicating records', () => {
    const rewards = {
      authoritative: true,
      dashboard: {
        history: [
          {
            id: 'xp-1',
            source: 'daily-login',
            amount: '5',
            currency: 'XP',
            atomicScale: 0,
            createdAt: '2026-11-03T09:00:00Z',
          },
          {
            id: 'rbc-1',
            source: 'mining',
            amount: '1200000',
            currency: 'RBC',
            atomicScale: 6,
            createdAt: '2026-11-03T08:00:00Z',
          },
        ],
      },
    }
    const cash = [
      {
        id: 'cash-1',
        kind: 'withdrawal',
        direction: 'debit',
        amountMinor: 200,
        currency: 'USD',
        createdAt: '2026-11-03T07:00:00Z',
      },
    ]
    const result = dashboardActivity(rewards, [...cash, ...cash])
    expect(result).toHaveLength(3)
    expect(result.map(activityAmount)).toEqual(['+5 XP', '+1.20 RBC', '−$2.00'])
    expect(result[0].kind).toBe('Daily login reward')
  })

  it('preserves atomic precision and negative reward adjustments', () => {
    const result = dashboardActivity(
      {
        authoritative: true,
        dashboard: {
          history: [
            {
              id: 'r',
              source: 'reversal',
              amount: '-9007199254740993123456',
              currency: 'RBC',
              atomicScale: 6,
              createdAt: '2026-11-03T08:00:00Z',
            },
          ],
        },
      },
      [],
    )
    expect(activityAmount(result[0])).toBe('−9,007,199,254,740,993.123456 RBC')
  })

  it('does not manufacture awards from missing or non-authoritative data', () => {
    expect(dashboardActivity(null, [])).toEqual([])
    expect(dashboardActivity({ authoritative: false, dashboard: { history: [{}] } }, [])).toEqual([])
  })
})
