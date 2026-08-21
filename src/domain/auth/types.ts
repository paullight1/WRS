export type AccountStatus = 'pending' | 'active' | 'suspended' | 'deleted'
export type VerificationKind = 'email' | 'phone'
export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type OAuthProvider = 'google' | 'apple'

export interface RegistrationInput {
  fullName: string
  email: string
  phone: string
  password: string
  passwordConfirmation: string
  termsAccepted: boolean
  privacyAccepted: boolean
  termsVersion: string
  privacyVersion: string
  referralCode?: string
}

export interface NormalizedRegistration {
  fullName: string
  normalizedEmail: string
  normalizedPhone: string
  password: string
  termsVersion: string
  privacyVersion: string
  referralCode?: string
}

export interface ValidationIssue {
  field: keyof RegistrationInput | 'identifier' | 'code'
  code: string
  message: string
}

export interface AuthSession {
  id: string
  userId: string
  status: AccountStatus
  emailVerified: boolean
  phoneVerified: boolean
  mfaEnabled: boolean
  mfaSatisfiedAt: string | null
  kycStatus: KycStatus
  roles: string[]
  expiresAt: string
}

export interface AccountSummary {
  userId: string
  status: AccountStatus
  emailVerified: boolean
  phoneVerified: boolean
}

export interface VerificationChallenge {
  id: string
  kind: VerificationKind
  expiresAt: string
  resendAvailableAt: string
}

export interface OAuthStart {
  provider: OAuthProvider
  authorizationUrl: string
  state: string
}

export interface OAuthCallbackInput {
  provider: OAuthProvider
  code: string
  state: string
  nonce: string
  codeVerifier: string
}

export interface MfaEnrollment {
  enrollmentId: string
  provisioningUri: string
  recoveryCodes: string[]
}

export interface AuthResult<T> {
  ok: boolean
  data?: T
  code?: string
  message?: string
}
