import { describe, expect, it } from 'vitest'
import { authorizeOwnedResource, authorizeSession, hasRecentMfa } from '../../src/domain/auth/policy'
import type { AuthSession } from '../../src/domain/auth/types'

const session = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  id: 'session-1',
  userId: 'user-a',
  status: 'active',
  emailVerified: true,
  phoneVerified: true,
  mfaEnabled: true,
  mfaSatisfiedAt: '2026-08-21T05:55:00.000Z',
  kycStatus: 'verified',
  roles: ['user'],
  expiresAt: '2026-08-21T08:00:00.000Z',
  ...overrides,
})

const now = new Date('2026-08-21T06:00:00.000Z')

describe('authorization policy', () => {
  it('fails closed for missing, expired and unverified sessions', () => {
    expect(authorizeSession(null, 'authenticated', now)).toEqual({ allowed: false, reason: 'unauthenticated' })
    expect(authorizeSession(session({ expiresAt: '2026-08-21T05:00:00.000Z' }), 'authenticated', now).reason).toBe('expired')
    expect(authorizeSession(session({ phoneVerified: false }), 'verified', now).reason).toBe('unverified')
  })

  it('does not allow ID substitution across owned resources', () => {
    expect(authorizeOwnedResource(session(), 'verified', 'user-a', now).allowed).toBe(true)
    expect(authorizeOwnedResource(session(), 'verified', 'user-b', now)).toEqual({ allowed: false, reason: 'forbidden' })
  })

  it('enforces KYC/admin policy independently of UI visibility', () => {
    expect(authorizeSession(session({ kycStatus: 'pending' }), 'kyc', now).reason).toBe('kyc-required')
    expect(authorizeSession(session(), 'admin', now).reason).toBe('forbidden')
    expect(authorizeSession(session({ roles: ['admin'] }), 'admin', now).allowed).toBe(true)
  })

  it('accepts only recent verified MFA for step-up semantics', () => {
    expect(hasRecentMfa(session(), now)).toBe(true)
    expect(hasRecentMfa(session({ mfaSatisfiedAt: '2026-08-21T05:30:00.000Z' }), now)).toBe(false)
  })
})
