export interface RewardPointEvent {
  id: string
  userId: string
  amount: number
  source: string
  referenceType: string
  referenceId: string
  idempotencyKey: string
  reversalOf?: string | null
}

export interface RewardBoost {
  slug: string
  name: string
  costPoints: number
  durationSeconds: number
  effect: Record<string, unknown>
  status: 'active' | 'retired'
}

export function rewardPointsBalance(events: RewardPointEvent[]) {
  return events.reduce((total, event) => {
    if (!Number.isSafeInteger(event.amount) || event.amount === 0) throw new Error('Reward point events must use non-zero integers.')
    return total + event.amount
  }, 0)
}

export function assertBoostActivation(balance: number, boost: RewardBoost) {
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('Reward point balance is invalid.')
  if (!Number.isSafeInteger(boost.costPoints) || boost.costPoints <= 0) throw new Error('Boost point cost is invalid.')
  if (!Number.isSafeInteger(boost.durationSeconds) || boost.durationSeconds <= 0) throw new Error('Boost duration is invalid.')
  if (boost.status !== 'active') throw new Error('Boost is unavailable.')
  if (balance < boost.costPoints) throw new Error('Insufficient reward points.')
}
