import { describe, expect, it } from 'vitest'
import { atomicRateToDecimal, atomicUnitsToDecimal, summarizeMiningSessions } from '../../src/domain/mining/metrics'

describe('mining metrics', () => {
  it('converts atomic units without floating point rounding', () => {
    expect(atomicUnitsToDecimal('900719925474099312345', 3)).toBe('900719925474099312.345')
    expect(atomicUnitsToDecimal('7', 0)).toBe('7')
    expect(atomicUnitsToDecimal('0', 2)).toBe('0.00')
    expect(atomicRateToDecimal('250', 2)).toBe('2.50')
    expect(atomicRateToDecimal('250.123456', 2)).toBe('2.50123456')
  })

  it('counts only an active cycle and weights the rate by persisted mining time', () => {
    const now = Date.parse('2026-09-29T12:00:00.000Z')
    const stats = summarizeMiningSessions(
      [
        {
          status: 'settled',
          startedAt: '2026-09-27T12:00:00.000Z',
          endsAt: '2026-09-28T12:00:00.000Z',
          rateAtomicPerHour: '100',
        },
        {
          status: 'active',
          startedAt: '2026-09-29T06:00:00.000Z',
          endsAt: '2026-09-30T06:00:00.000Z',
          rateAtomicPerHour: '300',
        },
        {
          status: 'cancelled',
          startedAt: '2026-09-26T12:00:00.000Z',
          endsAt: '2026-09-27T12:00:00.000Z',
          rateAtomicPerHour: '999',
        },
      ],
      now,
    )
    expect(stats).toEqual({
      activeRobots: 1,
      miningMilliseconds: 108_000_000,
      averageRateAtomicPerHour: '140',
    })
  })

  it('clamps an expired unsettled session at its configured cycle end', () => {
    const stats = summarizeMiningSessions(
      [
        {
          status: 'active',
          startedAt: '2026-09-27T00:00:00.000Z',
          endsAt: '2026-09-28T00:00:00.000Z',
          rateAtomicPerHour: '5',
        },
      ],
      Date.parse('2026-09-29T00:00:00.000Z'),
    )
    expect(stats).toEqual({ activeRobots: 0, miningMilliseconds: 86_400_000, averageRateAtomicPerHour: '5' })
  })
})
