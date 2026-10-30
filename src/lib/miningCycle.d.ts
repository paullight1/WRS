export const ROBOCOIN_REWARD: 1
export const MINING_INTERVAL_MS: number

export interface MiningCycleState {
  status: 'ready' | 'countdown'
  reward: 1
  nextEligibleAt: number
  remainingMs: number
}

export function isMiningAreaUnlocked(index: number): boolean
export function getMiningCycleState(lastClaimedAt: number | null | undefined, now?: number): MiningCycleState
