import { describe, expect, it } from 'vitest'
import { createReversalEvent, levelForXp, projectXpEvents } from '../../src/domain/robot/progression'
import type { XpEvent } from '../../src/domain/robot/types'

const event = (overrides: Partial<XpEvent> = {}): XpEvent => ({
  id: 'xp-1',
  robotId: 'robot-1',
  userId: 'user-1',
  source: 'training',
  amount: 250,
  referenceType: 'lesson',
  referenceId: 'lesson-1',
  idempotencyKey: 'training:lesson-1:user-1',
  reversalOf: null,
  metadata: {},
  createdAt: '2026-08-21T06:00:00.000Z',
  ...overrides,
})

describe('robot XP progression', () => {
  it('ignores duplicate idempotency keys', () => {
    const projection = projectXpEvents([
      event(),
      event({ id: 'xp-duplicate' }),
    ])
    expect(projection.totalXp).toBe(250)
    expect(projection.ignoredEventIds).toContain('xp-duplicate')
  })

  it('reverses with a compensating event rather than editing the original', () => {
    const original = event()
    const reversal = createReversalEvent(
      original,
      'xp-reversal',
      'reverse:xp-1',
      '2026-08-21T06:10:00.000Z',
    )
    const projection = projectXpEvents([original, reversal])
    expect(reversal.amount).toBe(-250)
    expect(reversal.reversalOf).toBe('xp-1')
    expect(projection.totalXp).toBe(0)
    expect(projection.reversedEventIds).toEqual(['xp-1'])
  })

  it('ignores invalid or duplicate reversals', () => {
    const original = event()
    const first = createReversalEvent(original, 'reverse-1', 'reverse:key:1', '2026-08-21T06:10:00.000Z')
    const second = createReversalEvent(original, 'reverse-2', 'reverse:key:2', '2026-08-21T06:11:00.000Z')
    const projection = projectXpEvents([original, first, second])
    expect(projection.ignoredEventIds).toContain('reverse-2')
    expect(projection.totalXp).toBe(0)
  })

  it('derives levels from deterministic thresholds', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(1000)).toBe(6)
  })
})
