export type DeploymentState = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed'
export type DeploymentRequestState = 'requested' | 'matched' | 'accepted' | 'rejected' | 'cancelled'
export type ContractState = 'offered' | 'accepted' | 'declined' | 'void'
export type WorkVerificationState = 'verified' | 'rejected'

export interface DeploymentOpportunity {
  id: string
  industrySlug: string
  clientName: string
  title: string
  description: string
  status: 'draft' | 'open' | 'paused' | 'closed'
  minPackageSlug: string
  requiredSkills: string[]
  requiredCertifications: string[]
  minQualityScore: number
  requireKyc: boolean
  regulated: boolean
  allowedCountries: string[]
  rateMinor: number
  rateUnit: 'hour' | 'task'
  currency: string
  slots: number
  startsAt: string | null
  endsAt: string | null
  termsTemplate: Record<string, unknown>
}

export interface DeploymentEligibilityEvidence {
  packageSlug: string
  robotLifecycle: string
  kycStatus: string
  qualityScore: number
  available: boolean
  countryCode: string | null
  verifiedSkills: string[]
  activeCertifications: string[]
}

export interface DeploymentEligibilityRequirement {
  minPackageSlug: string
  requiredSkills: string[]
  requiredCertifications: string[]
  minQualityScore: number
  requireKyc: boolean
  regulated: boolean
  allowedCountries: string[]
}

export interface DeploymentEligibilityDecision {
  eligible: boolean
  reasons: string[]
}

export interface DeploymentRequestRecord {
  id: string
  opportunityId: string
  robotId: string
  status: DeploymentRequestState
  requestedAt: string
}

export interface DeploymentContractRecord {
  id: string
  requestId: string
  status: ContractState
  rateMinor: number
  rateUnit: 'hour' | 'task'
  currency: string
  termsSnapshot: Record<string, unknown>
  offeredAt: string
  acceptedAt: string | null
}

export interface DeploymentRecord {
  id: string
  opportunityId: string
  robotId: string
  contractId: string
  status: DeploymentState
  version: number
  scheduledStart: string | null
  scheduledEnd: string | null
  startedAt: string | null
  completedAt: string | null
}

export interface DeploymentWorkInput {
  taskReference: string
  durationMinutes: number
  units: number
  metadata?: Record<string, unknown>
  idempotencyKey: string
}
