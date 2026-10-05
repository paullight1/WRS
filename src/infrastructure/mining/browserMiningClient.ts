import type { MiningLeaderboard, MiningLeaderboardPeriod, MiningSnapshot } from '../../domain/mining/types'

type Json = Record<string, unknown>

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : 'Mining service could not be reached.'
    throw new Error(message)
  }
  return body as T
}

function isRecord(value: unknown): value is Json {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function atomicScale(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 12)
}

function validateSnapshot(value: unknown): MiningSnapshot {
  if (!isRecord(value)) throw new Error('Mining status returned an invalid response.')
  const stats = value.stats
  const balance = value.balance
  const session = value.session
  const slotProgress = value.robotSlotProgress
  const validRobot = (item: unknown) =>
    isRecord(item) &&
    typeof item.robotId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.unlocked === 'boolean' &&
    (item.unlockRequirement === null || typeof item.unlockRequirement === 'string')
  const validWorksite = (item: unknown) =>
    isRecord(item) &&
    typeof item.worksiteId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.available === 'boolean'
  const validSession = (item: unknown) =>
    item === null ||
    (isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.robotId === 'string' &&
      (typeof item.worksiteId === 'string' || item.worksiteId === null) &&
      ['active', 'ended', 'settled', 'cancelled'].includes(String(item.status)))
  if (
    value.authoritative !== true ||
    typeof value.serverNow !== 'string' ||
    !validSession(session) ||
    !Array.isArray(value.recentSessions) ||
    !value.recentSessions.every(validSession) ||
    !Array.isArray(value.robots) ||
    !value.robots.every(validRobot) ||
    !Array.isArray(value.worksites) ||
    !value.worksites.every(validWorksite) ||
    !isRecord(stats) ||
    ![0, 1].includes(Number(stats.activeRobots)) ||
    !Number.isSafeInteger(stats.miningMilliseconds) ||
    Number(stats.miningMilliseconds) < 0 ||
    !(stats.averageRateAtomicPerHour === null || typeof stats.averageRateAtomicPerHour === 'string') ||
    !atomicScale(stats.atomicScale) ||
    !isRecord(balance) ||
    !(balance.availableAtomic === null || typeof balance.availableAtomic === 'string') ||
    !atomicScale(balance.atomicScale) ||
    (slotProgress !== undefined &&
      (!isRecord(slotProgress) ||
        typeof slotProgress.lifetimeMinedRbc !== 'string' ||
        !/^\d+(?:\.\d+)?$/.test(slotProgress.lifetimeMinedRbc) ||
        slotProgress.thresholdRbc !== '200' ||
        typeof slotProgress.unlocked !== 'boolean'))
  ) {
    throw new Error('Mining status returned an invalid response.')
  }
  return value as unknown as MiningSnapshot
}

function validateLeaderboard(value: unknown, period: MiningLeaderboardPeriod): MiningLeaderboard {
  if (!isRecord(value) || value.period !== period || !Array.isArray(value.rows)) {
    throw new Error('Mining leaderboard returned an invalid response.')
  }
  const rows = value.rows.map((row) => {
    if (
      !isRecord(row) ||
      !Number.isInteger(row.rank) ||
      Number(row.rank) < 1 ||
      typeof row.memberHandle !== 'string' ||
      typeof row.earnedAtomic !== 'string' ||
      !Number.isInteger(row.atomicScale) ||
      Number(row.atomicScale) < 0 ||
      Number(row.atomicScale) > 12
    ) {
      throw new Error('Mining leaderboard returned an invalid response.')
    }
    return {
      rank: Number(row.rank),
      memberHandle: row.memberHandle,
      earnedAtomic: row.earnedAtomic,
      atomicScale: Number(row.atomicScale),
    }
  })
  return { period, rows }
}

export const browserMiningClient = {
  async claimDailyActivity(): Promise<Record<string, unknown>> {
    return request('/api/rewards/activity', { method: 'POST' })
  },
  async snapshot(): Promise<MiningSnapshot> {
    return validateSnapshot(await request<unknown>('/api/mining'))
  },
  async start(input: { robotId: string; idempotencyKey: string }): Promise<MiningSnapshot> {
    return validateSnapshot(
      await request<unknown>('/api/mining/start', {
        method: 'POST',
        body: JSON.stringify({
          robotId: input.robotId,
          idempotencyKey: input.idempotencyKey,
        }),
      }),
    )
  },
  async leaderboard(period: MiningLeaderboardPeriod): Promise<MiningLeaderboard> {
    return validateLeaderboard(
      await request<unknown>(`/api/mining/leaderboard?period=${encodeURIComponent(period)}`),
      period,
    )
  },
}
