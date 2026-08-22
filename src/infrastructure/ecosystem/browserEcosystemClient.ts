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
    const result = await request<{ items: MarketplaceCatalogItem[] }>('/api/marketplace')
    return result.items
  },
  acquire: (versionId, idempotencyKey) =>
    request<Json>('/api/marketplace/purchase', { method: 'POST', body: JSON.stringify({ versionId, idempotencyKey }) }),
  install: (entitlementId) =>
    request<Json>('/api/marketplace/install', { method: 'POST', body: JSON.stringify({ entitlementId }) }),
  review: (itemId, rating, reviewText) =>
    request<Json>('/api/marketplace/review', { method: 'POST', body: JSON.stringify({ itemId, rating, reviewText }) }),
  async rewards() {
    return request<RewardSnapshot>('/api/rewards')
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
