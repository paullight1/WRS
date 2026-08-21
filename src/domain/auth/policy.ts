import type { AuthSession } from './types'

export type RoutePolicy = 'public' | 'authenticated' | 'verified' | 'kyc' | 'admin'

export interface AuthorizationDecision {
  allowed: boolean
  reason?: 'unauthenticated' | 'unverified' | 'kyc-required' | 'forbidden' | 'expired' | 'suspended'
}

export function authorizeSession(session: AuthSession | null, policy: RoutePolicy, now = new Date()): AuthorizationDecision {
  if (policy === 'public') return { allowed: true }
  if (!session) return { allowed: false, reason: 'unauthenticated' }
  if (session.status === 'suspended' || session.status === 'deleted') return { allowed: false, reason: 'suspended' }
  if (new Date(session.expiresAt).getTime() <= now.getTime()) return { allowed: false, reason: 'expired' }
  if (policy === 'authenticated') return { allowed: true }
  if (!session.emailVerified || !session.phoneVerified) return { allowed: false, reason: 'unverified' }
  if (policy === 'verified') return { allowed: true }
  if (session.kycStatus !== 'verified') return { allowed: false, reason: 'kyc-required' }
  if (policy === 'kyc') return { allowed: true }
  return session.roles.includes('admin') ? { allowed: true } : { allowed: false, reason: 'forbidden' }
}

export function hasRecentMfa(session: AuthSession, now = new Date(), maxAgeMinutes = 10): boolean {
  if (!session.mfaEnabled || !session.mfaSatisfiedAt) return false
  const age = now.getTime() - new Date(session.mfaSatisfiedAt).getTime()
  return age >= 0 && age <= maxAgeMinutes * 60_000
}

export function requiresStepUp(session: AuthSession | null): boolean {
  return !session || !hasRecentMfa(session)
}
