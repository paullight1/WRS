import type { AuthSession } from './types'

export type RoutePolicy = 'public' | 'authenticated' | 'verified' | 'kyc' | 'admin' | 'operations' | 'account-recovery'

export interface AuthorizationDecision {
  allowed: boolean
  reason?:
    | 'unauthenticated'
    | 'unverified'
    | 'kyc-required'
    | 'forbidden'
    | 'expired'
    | 'suspended'
    | 'deletion-pending'
}

const OPERATIONS_ROLES = new Set([
  'admin',
  'support_operator',
  'kyc_operator',
  'finance_operator',
  'data_operator',
  'deployment_operator',
  'risk_operator',
])

export function authorizeSession(
  session: AuthSession | null,
  policy: RoutePolicy,
  now = new Date(),
): AuthorizationDecision {
  if (policy === 'public') return { allowed: true }
  if (!session) return { allowed: false, reason: 'unauthenticated' }
  if (session.status === 'suspended' || session.status === 'deleted') {
    return { allowed: false, reason: 'suspended' }
  }
  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    return { allowed: false, reason: 'expired' }
  }
  if (session.accountDeletionPending) {
    return policy === 'account-recovery' ? { allowed: true } : { allowed: false, reason: 'deletion-pending' }
  }
  if (policy === 'account-recovery' || policy === 'authenticated') return { allowed: true }
  if (!session.emailVerified || !session.phoneVerified) {
    return { allowed: false, reason: 'unverified' }
  }
  if (policy === 'verified') return { allowed: true }
  if (policy === 'operations') {
    return session.roles.some((role) => OPERATIONS_ROLES.has(role))
      ? { allowed: true }
      : { allowed: false, reason: 'forbidden' }
  }
  if (session.kycStatus !== 'verified') return { allowed: false, reason: 'kyc-required' }
  if (policy === 'kyc') return { allowed: true }
  return session.roles.includes('admin') ? { allowed: true } : { allowed: false, reason: 'forbidden' }
}

export function authorizeOwnedResource(
  session: AuthSession | null,
  policy: RoutePolicy,
  ownerUserId: string,
  now = new Date(),
): AuthorizationDecision {
  const base = authorizeSession(session, policy, now)
  if (!base.allowed) return base
  if (!session || session.userId !== ownerUserId) return { allowed: false, reason: 'forbidden' }
  return { allowed: true }
}

export function hasRecentMfa(session: AuthSession, now = new Date(), maxAgeMinutes = 10): boolean {
  if (!session.mfaEnabled || !session.mfaSatisfiedAt) return false
  const age = now.getTime() - new Date(session.mfaSatisfiedAt).getTime()
  return age >= 0 && age <= maxAgeMinutes * 60_000
}

export function requiresStepUp(session: AuthSession | null): boolean {
  return !session || !hasRecentMfa(session)
}
