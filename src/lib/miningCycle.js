export const ROBOCOIN_REWARD = 1
export const MINING_INTERVAL_MS = 24 * 60 * 60 * 1000

export function isMiningAreaUnlocked(index) {
  return index === 0
}

export function getMiningCycleState(lastClaimedAt, now = Date.now()) {
  const nextEligibleAt = lastClaimedAt == null ? now : lastClaimedAt + MINING_INTERVAL_MS
  const remainingMs = Math.max(0, nextEligibleAt - now)

  return {
    status: remainingMs === 0 ? 'ready' : 'countdown',
    reward: ROBOCOIN_REWARD,
    nextEligibleAt,
    remainingMs,
  }
}
