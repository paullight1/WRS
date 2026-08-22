import { describe, expect, it } from 'vitest'
import { hasActiveConsent, latestConsent } from '../../src/domain/data/consent'
import { calculateQualityScore, qualityDecision } from '../../src/domain/data/quality'

describe('Plan 6 consent domain', () => {
  const events = [
    { purposeSlug: 'dataset-contribution', policyVersion: 1, dataCategory: 'voice' as const, action: 'granted' as const, occurredAt: '2026-08-20T10:00:00Z' },
    { purposeSlug: 'research-licensing', policyVersion: 1, dataCategory: 'voice' as const, action: 'granted' as const, occurredAt: '2026-08-20T10:01:00Z' },
    { purposeSlug: 'research-licensing', policyVersion: 1, dataCategory: 'voice' as const, action: 'withdrawn' as const, occurredAt: '2026-08-20T10:02:00Z' },
  ]

  it('keeps purposes independent and honors the latest event', () => {
    expect(hasActiveConsent(events, 'dataset-contribution', 'voice', 1)).toBe(true)
    expect(hasActiveConsent(events, 'research-licensing', 'voice', 1)).toBe(false)
    expect(latestConsent(events, 'research-licensing', 'voice')?.action).toBe('withdrawn')
  })

  it('fails old consent closed after a policy version changes', () => {
    expect(hasActiveConsent(events, 'dataset-contribution', 'voice', 2)).toBe(false)
  })
})

describe('Plan 6 quality domain', () => {
  it('scores deterministic quality dimensions', () => {
    const score = calculateQualityScore({
      completeness: 90,
      accuracy: 90,
      consistency: 80,
      signalQuality: 90,
      reviewerAgreement: 90,
      policyCompliance: 100,
    })
    expect(score).toBe(89)
    expect(qualityDecision(score)).toBe('approved')
  })

  it('fails policy non-compliance closed regardless of other scores', () => {
    const score = calculateQualityScore({
      completeness: 100,
      accuracy: 100,
      consistency: 100,
      signalQuality: 100,
      reviewerAgreement: 100,
      policyCompliance: 99,
    })
    expect(score).toBe(0)
    expect(qualityDecision(score)).toBe('rejected')
  })
})
