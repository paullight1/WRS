export type PackageSlug = 'starter' | 'builder' | 'professional' | 'enterprise' | 'elite' | 'visionary'

export type RobotLifecycle = 'pending' | 'active' | 'suspended' | 'retired'
export type EntitlementStatus = 'pending' | 'active' | 'refunded' | 'revoked' | 'expired'
export type XpSource = 'training' | 'data' | 'deployment' | 'reward' | 'academy' | 'admin-adjustment'

export interface RobotRecord {
  id: string
  ownerUserId: string
  name: string
  lifecycle: RobotLifecycle
  packageSlug: PackageSlug
  requestedPackageSlug: PackageSlug
  publicVerificationId: string
  activationDate: string
  createdAt: string
  updatedAt: string
}

export interface RobotTuning {
  speed: number
  battery: number
  sensor: number
}

export interface RobotConfigurationInput {
  palette: string
  parts: Record<string, string>
  personality: string
  tuning: RobotTuning
  voiceProfileId: string
}

export interface RobotConfiguration extends RobotConfigurationInput {
  robotId: string
  version: number
  updatedAt: string
}

export interface OnboardingDraft extends RobotConfigurationInput {
  step: number
  requestedPackageSlug: PackageSlug
  name: string
}

export interface OnboardingCompletionInput extends RobotConfigurationInput {
  requestedPackageSlug: PackageSlug
  name: string
}

export type OnboardingCompletionResult =
  | { status: 'completed'; robot: RobotRecord; configuration: RobotConfiguration }
  | { status: 'already-completed'; robot: RobotRecord; configuration: RobotConfiguration }
  | { status: 'entitlement-required'; packageSlug: PackageSlug }

export type ConfigurationSaveResult =
  | { status: 'saved'; configuration: RobotConfiguration }
  | { status: 'conflict'; current: RobotConfiguration }
  | { status: 'forbidden' }
  | { status: 'capability-locked'; capability: string }

export interface RobotPassportSkill {
  slug: string
  name: string
  version: string
  installedAt: string
  verified: boolean
}

export interface RobotPassportCertification {
  slug: string
  name: string
  issuer: string
  issuedAt: string
  expiresAt: string | null
  verificationReference: string
  status: 'active' | 'expired' | 'revoked'
}

export interface RobotPassportHistoryEvent {
  id: string
  eventType: string
  occurredAt: string
  publicSummary: string
}

export interface RobotPassport {
  authoritative: boolean
  robotId: string
  publicVerificationId: string
  name: string
  robotClass: string
  packageSlug: PackageSlug
  lifecycle: RobotLifecycle
  activationDate: string
  level: number
  totalXp: number
  issuedAt: string
  skills: RobotPassportSkill[]
  certifications: RobotPassportCertification[]
  history: RobotPassportHistoryEvent[]
}

export interface PassportPdfDescriptor {
  url: string
  filename: string
  expiresAt: string
}

export interface XpEvent {
  id: string
  robotId: string
  userId: string
  source: XpSource
  amount: number
  referenceType: string
  referenceId: string
  idempotencyKey: string
  reversalOf: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface XpProjection {
  totalXp: number
  level: number
  acceptedEventIds: string[]
  ignoredEventIds: string[]
  reversedEventIds: string[]
}
