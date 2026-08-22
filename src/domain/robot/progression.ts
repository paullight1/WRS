import type { XpEvent, XpProjection, XpSource } from './types'

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000,
] as const

export function levelForXp(totalXp: number): number {
  const normalized = Math.max(0, Math.floor(totalXp))
  let level = 1
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (normalized >= LEVEL_THRESHOLDS[index]) level = index + 1
    else break
  }
  return level
}

export function validateXpAward(input: {
  robotId: string
  userId: string
  source: XpSource
  amount: number
  referenceType: string
  referenceId: string
  idempotencyKey: string
}): string[] {
  const issues: string[] = []
  if (!input.robotId) issues.push('robotId')
  if (!input.userId) issues.push('userId')
  if (!input.referenceType) issues.push('referenceType')
  if (!input.referenceId) issues.push('referenceId')
  if (!input.idempotencyKey) issues.push('idempotencyKey')
  if (!Number.isInteger(input.amount) || input.amount <= 0) issues.push('amount')
  return issues
}

export function createReversalEvent(
  original: XpEvent,
  id: string,
  idempotencyKey: string,
  createdAt: string,
  metadata: Record<string, unknown> = {},
): XpEvent {
  return {
    id,
    robotId: original.robotId,
    userId: original.userId,
    source: 'admin-adjustment',
    amount: -original.amount,
    referenceType: 'xp-reversal',
    referenceId: original.id,
    idempotencyKey,
    reversalOf: original.id,
    metadata,
    createdAt,
  }
}

export function projectXpEvents(events: readonly XpEvent[]): XpProjection {
  const byId = new Map<string, XpEvent>()
  const seenIdempotency = new Set<string>()
  const reversed = new Set<string>()
  const acceptedEventIds: string[] = []
  const ignoredEventIds: string[] = []
  let totalXp = 0

  for (const event of events) {
    if (seenIdempotency.has(event.idempotencyKey) || byId.has(event.id)) {
      ignoredEventIds.push(event.id)
      continue
    }

    if (event.reversalOf) {
      const target = byId.get(event.reversalOf)
      if (!target || reversed.has(target.id) || event.amount !== -target.amount) {
        ignoredEventIds.push(event.id)
        continue
      }
      reversed.add(target.id)
    }

    seenIdempotency.add(event.idempotencyKey)
    byId.set(event.id, event)
    acceptedEventIds.push(event.id)
    totalXp += event.amount
  }

  const normalizedXp = Math.max(0, totalXp)
  return {
    totalXp: normalizedXp,
    level: levelForXp(normalizedXp),
    acceptedEventIds,
    ignoredEventIds,
    reversedEventIds: [...reversed],
  }
}
