import { describe, expect, it, vi } from 'vitest'
import { DataService, type DataRepository } from '../../src/services/data/DataService'

function repository(activeConsent = true): DataRepository {
  return {
    hasActiveConsent: vi.fn(async () => activeConsent),
    registerAsset: vi.fn(async () => ({ assetId: 'asset-1' })),
    submitAsset: vi.fn(async () => ({ submissionId: 'submission-1' })),
    reviewSubmission: vi.fn(async (_id, _dimensions, score, decision) => ({ score, decision })),
  }
}

describe('DataService', () => {
  it('refuses asset registration without active purpose/category consent', async () => {
    const repo = repository(false)
    const service = new DataService(repo)
    await expect(
      service.authorizeAsset({
        userId: 'user-1',
        purposeSlug: 'dataset-contribution',
        category: 'document',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageBucket: 'private',
        storagePath: 'user-1/document/test.pdf',
      }),
    ).rejects.toThrow(/active consent/i)
    expect(repo.registerAsset).not.toHaveBeenCalled()
  })

  it('registers a consented server-selected private asset', async () => {
    const repo = repository(true)
    const service = new DataService(repo)
    await expect(
      service.authorizeAsset({
        userId: 'user-1',
        purposeSlug: 'dataset-contribution',
        category: 'document',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageBucket: 'private',
        storagePath: 'user-1/document/test.pdf',
      }),
    ).resolves.toEqual({ assetId: 'asset-1' })
  })

  it('computes review score/decision before repository persistence', async () => {
    const repo = repository(true)
    const service = new DataService(repo)
    const result = await service.review('submission-1', {
      completeness: 90,
      accuracy: 90,
      consistency: 90,
      signalQuality: 90,
      reviewerAgreement: 90,
      policyCompliance: 100,
    })
    expect(result).toEqual({ score: 90, decision: 'approved' })
    expect(repo.reviewSubmission).toHaveBeenCalledWith('submission-1', expect.any(Object), 90, 'approved')
  })
})
