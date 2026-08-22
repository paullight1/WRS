import { assertConsentPurpose, type DataCategory } from '../../domain/data/consent'
import { calculateQualityScore, qualityDecision, type QualityDimensions } from '../../domain/data/quality'

export interface DataRepository {
  hasActiveConsent(userId: string, purposeSlug: string, category: DataCategory): Promise<boolean>
  registerAsset(input: {
    userId: string
    purposeSlug: string
    category: DataCategory
    mimeType: string
    sizeBytes: number
    storageBucket: string
    storagePath: string
  }): Promise<{ assetId: string }>
  submitAsset(userId: string, assetId: string, metadata: Record<string, unknown>): Promise<unknown>
  reviewSubmission(
    submissionId: string,
    dimensions: QualityDimensions,
    score: number,
    decision: string,
  ): Promise<unknown>
}

export class DataService {
  constructor(private readonly repository: DataRepository) {}

  async authorizeAsset(input: {
    userId: string
    purposeSlug: string
    category: DataCategory
    mimeType: string
    sizeBytes: number
    storageBucket: string
    storagePath: string
  }) {
    const purposeSlug = assertConsentPurpose(input.purposeSlug)
    if (!(await this.repository.hasActiveConsent(input.userId, purposeSlug, input.category))) {
      throw new Error('Active consent is required for this data use.')
    }
    if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) throw new Error('Invalid asset size.')
    return this.repository.registerAsset({ ...input, purposeSlug })
  }

  submit(userId: string, assetId: string, metadata: Record<string, unknown>) {
    return this.repository.submitAsset(userId, assetId, metadata)
  }

  review(submissionId: string, dimensions: QualityDimensions) {
    const score = calculateQualityScore(dimensions)
    return this.repository.reviewSubmission(submissionId, dimensions, score, qualityDecision(score))
  }
}
