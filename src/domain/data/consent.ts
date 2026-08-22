export type ConsentAction = 'granted' | 'withdrawn'
export type DataCategory = 'voice' | 'face' | 'movement' | 'document' | 'text' | 'image' | 'video' | 'conversation'

export interface ConsentEvidence {
  purposeSlug: string
  policyVersion: number
  dataCategory: DataCategory
  action: ConsentAction
  occurredAt: string
}

export function latestConsent(events: ConsentEvidence[], purposeSlug: string, dataCategory: DataCategory) {
  return (
    [...events]
      .filter((event) => event.purposeSlug === purposeSlug && event.dataCategory === dataCategory)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0] ?? null
  )
}

export function hasActiveConsent(
  events: ConsentEvidence[],
  purposeSlug: string,
  dataCategory: DataCategory,
  currentVersion: number,
): boolean {
  const latest = latestConsent(events, purposeSlug, dataCategory)
  return Boolean(latest && latest.action === 'granted' && latest.policyVersion === currentVersion)
}

export function assertConsentPurpose(purposeSlug: string): string {
  const purpose = String(purposeSlug || '')
    .trim()
    .toLowerCase()
  if (!['personal-robot', 'dataset-contribution', 'research-licensing'].includes(purpose)) {
    throw new Error('Unknown consent purpose.')
  }
  return purpose
}
