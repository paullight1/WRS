import { describe, expect, it } from 'vitest'
import { MINING_INTERVAL_MS, getMiningCycleState, isMiningAreaUnlocked } from '../../src/lib/miningCycle.js'

describe('mining cycle policy', () => {
  it('keeps only the starter area unlocked', () => {
    expect(isMiningAreaUnlocked(0)).toBe(true)
    expect(isMiningAreaUnlocked(1)).toBe(false)
    expect(isMiningAreaUnlocked(8)).toBe(false)
  })

  it('is ready for a first claim and awards one RoboCoin', () => {
    const state = getMiningCycleState(null, 1_000)

    expect(state.status).toBe('ready')
    expect(state.reward).toBe(1)
    expect(state.nextEligibleAt).toBe(1_000)
  })

  it('waits until a full 24-hour cycle has elapsed', () => {
    const lastClaimedAt = 10_000
    const now = lastClaimedAt + MINING_INTERVAL_MS - 1
    const state = getMiningCycleState(lastClaimedAt, now)

    expect(state.status).toBe('countdown')
    expect(state.reward).toBe(1)
    expect(state.remainingMs).toBe(1)
  })

  it('becomes claimable exactly at the next 24-hour boundary', () => {
    const lastClaimedAt = 10_000
    const state = getMiningCycleState(lastClaimedAt, lastClaimedAt + MINING_INTERVAL_MS)

    expect(state.status).toBe('ready')
    expect(state.remainingMs).toBe(0)
  })
})
