export interface QualityDimensions {
  completeness: number
  accuracy: number
  consistency: number
  signalQuality: number
  reviewerAgreement: number
  policyCompliance: number
}

function dimension(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100)
    throw new Error('Quality dimensions must be between 0 and 100.')
  return value
}

export function calculateQualityScore(input: QualityDimensions): number {
  const completeness = dimension(input.completeness)
  const accuracy = dimension(input.accuracy)
  const consistency = dimension(input.consistency)
  const signalQuality = dimension(input.signalQuality)
  const reviewerAgreement = dimension(input.reviewerAgreement)
  const policyCompliance = dimension(input.policyCompliance)
  if (policyCompliance < 100) return 0
  return Math.round(
    completeness * 0.2 + accuracy * 0.25 + consistency * 0.15 + signalQuality * 0.15 + reviewerAgreement * 0.25,
  )
}

export function qualityDecision(score: number): 'approved' | 'review' | 'rejected' {
  if (score >= 80) return 'approved'
  if (score >= 60) return 'review'
  return 'rejected'
}
