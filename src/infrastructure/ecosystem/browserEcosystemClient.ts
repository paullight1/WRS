import {
  EcosystemService,
  type EcosystemRepository,
  type MarketplaceCatalogItem,
  type RewardSnapshot,
} from '../../services/ecosystem/EcosystemService'

type Json = Record<string, unknown>

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Ecosystem request failed.')
  return body as T
}

const repository: EcosystemRepository = {
  async marketplace() {
    const result = await request<{ items?: unknown }>('/api/marketplace')
    if (
      !Array.isArray(result?.items) ||
      !result.items.every(
        (item) =>
          item && typeof item === 'object' && typeof item.versionId === 'string' && typeof item.name === 'string',
      )
    ) {
      throw new Error('Marketplace service returned an invalid catalogue.')
    }
    return result.items as MarketplaceCatalogItem[]
  },
  acquire: (versionId, idempotencyKey) =>
    request<Json>('/api/marketplace/purchase', { method: 'POST', body: JSON.stringify({ versionId, idempotencyKey }) }),
  install: (entitlementId) =>
    request<Json>('/api/marketplace/install', { method: 'POST', body: JSON.stringify({ entitlementId }) }),
  review: (itemId, rating, reviewText) =>
    request<Json>('/api/marketplace/review', { method: 'POST', body: JSON.stringify({ itemId, rating, reviewText }) }),
  async rewards() {
    const result = await request<RewardSnapshot>('/api/rewards')
    const validCount = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0
    if (
      result?.authoritative !== true ||
      !validCount(result.xp) ||
      !result.dashboard ||
      !validCount(result.dashboard.totalXp) ||
      !validCount(result.dashboard.activityXp) ||
      !validCount(result.dashboard.referralXp) ||
      !result.dashboard.referrals ||
      !Object.values(result.dashboard.referrals).every(validCount) ||
      !Array.isArray(result.activities) ||
      !Array.isArray(result.levels) ||
      !result.rbc ||
      !Array.isArray(result.dashboard.history) ||
      !result.dashboard.history.every(
        (award) =>
          typeof award.id === 'string' &&
          typeof award.source === 'string' &&
          typeof award.amount === 'string' &&
          /^-?\d+$/.test(award.amount) &&
          ['XP', 'RBC'].includes(award.currency) &&
          Number.isInteger(award.atomicScale) &&
          award.atomicScale >= 0 &&
          award.atomicScale <= 12 &&
          typeof award.createdAt === 'string' &&
          Number.isFinite(Date.parse(award.createdAt)),
      )
    ) {
      throw new Error('Rewards service returned an invalid response. Please retry.')
    }
    return result
  },
  redeemEventCode: (code) =>
    request<Json>('/api/rewards/event-code', { method: 'POST', body: JSON.stringify({ code }) }),
  activateBoost: (boostSlug, idempotencyKey) =>
    request<Json>('/api/rewards/boost', { method: 'POST', body: JSON.stringify({ boostSlug, idempotencyKey }) }),
  academy: () => request<Json>('/api/academy'),
  enrollCourse: (courseId) => request<Json>('/api/academy', { method: 'POST', body: JSON.stringify({ courseId }) }),
  recordProgress: (enrollmentId, moduleId, completionPercent) =>
    request<Json>('/api/academy/progress', {
      method: 'POST',
      body: JSON.stringify({ enrollmentId, moduleId, completionPercent }),
    }),
  community: () => request<Json>('/api/community'),
  joinEvent: (eventId, reminderEnabled) =>
    request<Json>('/api/community/event', { method: 'POST', body: JSON.stringify({ eventId, reminderEnabled }) }),
  setLeaderboard: (optedIn, displayAlias) =>
    request<Json>('/api/community/profile', { method: 'POST', body: JSON.stringify({ optedIn, displayAlias }) }),
  referrals: () => request<Json>('/api/referrals'),
  acceptReferral: (code) => request<Json>('/api/referrals/accept', { method: 'POST', body: JSON.stringify({ code }) }),
}

export const browserEcosystemClient = new EcosystemService(repository)
