export type MarketplaceCatalogItem = {
  id: string
  versionId: string
  name: string
  description: string
  itemType: string
  minPackageSlug: string
  version: string
  priceMinor: number
  currency: string
  skillSlug: string | null
  entitlementId?: string | null
  installed?: boolean
}

export type RewardSnapshot = {
  points: number
  boosts: Array<Record<string, unknown>>
}

export interface EcosystemRepository {
  marketplace(): Promise<MarketplaceCatalogItem[]>
  acquire(versionId: string, idempotencyKey: string): Promise<Record<string, unknown>>
  install(entitlementId: string): Promise<Record<string, unknown>>
  review(itemId: string, rating: number, reviewText: string): Promise<Record<string, unknown>>
  rewards(): Promise<RewardSnapshot>
  redeemEventCode(code: string): Promise<Record<string, unknown>>
  activateBoost(boostSlug: string, idempotencyKey: string): Promise<Record<string, unknown>>
  academy(): Promise<Record<string, unknown>>
  enrollCourse(courseId: string): Promise<Record<string, unknown>>
  recordProgress(enrollmentId: string, moduleId: string, completionPercent: number): Promise<Record<string, unknown>>
  community(): Promise<Record<string, unknown>>
  joinEvent(eventId: string, leaderboardOptIn: boolean): Promise<Record<string, unknown>>
  referrals(): Promise<Record<string, unknown>>
  acceptReferral(code: string): Promise<Record<string, unknown>>
}

export class EcosystemService {
  constructor(private readonly repository: EcosystemRepository) {}

  marketplace() {
    return this.repository.marketplace()
  }

  acquire(versionId: string, idempotencyKey: string) {
    if (!versionId || idempotencyKey.trim().length < 8) throw new Error('Marketplace acquisition requires an item and idempotency key.')
    return this.repository.acquire(versionId, idempotencyKey)
  }

  install(entitlementId: string) {
    if (!entitlementId) throw new Error('Marketplace entitlement is required.')
    return this.repository.install(entitlementId)
  }

  review(itemId: string, rating: number, reviewText: string) {
    if (!itemId) throw new Error('Marketplace item is required.')
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')
    return this.repository.review(itemId, rating, reviewText.trim().slice(0, 2000))
  }

  rewards() {
    return this.repository.rewards()
  }

  redeemEventCode(code: string) {
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z0-9-]{8,64}$/.test(normalized)) throw new Error('Enter a valid event code.')
    return this.repository.redeemEventCode(normalized)
  }

  activateBoost(boostSlug: string, idempotencyKey: string) {
    if (!boostSlug || idempotencyKey.trim().length < 8) throw new Error('Boost activation requires a boost and idempotency key.')
    return this.repository.activateBoost(boostSlug, idempotencyKey)
  }

  academy() {
    return this.repository.academy()
  }

  enrollCourse(courseId: string) {
    if (!courseId) throw new Error('Course is required.')
    return this.repository.enrollCourse(courseId)
  }

  recordProgress(enrollmentId: string, moduleId: string, completionPercent: number) {
    if (!enrollmentId || !moduleId) throw new Error('Enrollment and module are required.')
    if (!Number.isFinite(completionPercent) || completionPercent < 0 || completionPercent > 100) {
      throw new Error('Completion must be between 0 and 100.')
    }
    return this.repository.recordProgress(enrollmentId, moduleId, completionPercent)
  }

  community() {
    return this.repository.community()
  }

  joinEvent(eventId: string, leaderboardOptIn = false) {
    if (!eventId) throw new Error('Community event is required.')
    return this.repository.joinEvent(eventId, leaderboardOptIn)
  }

  referrals() {
    return this.repository.referrals()
  }

  acceptReferral(code: string) {
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{6,24}$/.test(normalized)) throw new Error('Enter a valid referral code.')
    return this.repository.acceptReferral(normalized)
  }
}
