export type MarketplaceItemType = 'skill' | 'language' | 'module'
export type MarketplaceStatus = 'draft' | 'published' | 'suspended' | 'retired'
export type EntitlementStatus = 'active' | 'revoked' | 'refunded' | 'expired'

export interface MarketplaceVersion {
  id: string
  itemId: string
  version: string
  priceMinor: number
  currency: string
  skillSlug: string | null
  capabilitySlug: string | null
  verificationStatus: 'pending' | 'approved' | 'rejected'
  manifest: Record<string, unknown>
}

export interface MarketplaceItem {
  id: string
  slug: string
  name: string
  description: string
  itemType: MarketplaceItemType
  minPackageSlug: string
  status: MarketplaceStatus
  latestVersion: MarketplaceVersion | null
}

export function assertMarketplacePrice(priceMinor: number, currency: string) {
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) throw new Error('Marketplace price must use integer minor units.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Marketplace currency must be an ISO-style three-letter code.')
}

export function marketplaceVersionInstallable(version: MarketplaceVersion) {
  return version.verificationStatus === 'approved' && Boolean(version.skillSlug || version.capabilitySlug)
}

export function marketplaceVersionFree(version: MarketplaceVersion) {
  assertMarketplacePrice(version.priceMinor, version.currency)
  return version.priceMinor === 0
}
