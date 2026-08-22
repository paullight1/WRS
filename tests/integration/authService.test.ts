import { describe, expect, it, vi } from 'vitest'
import { AuthService, type AuthRepository } from '../../src/services/auth/AuthService'
import type { AuthSession, OAuthProvider, VerificationKind } from '../../src/domain/auth/types'

const liveSession: AuthSession = {
  id: 'session-1',
  userId: 'user-1',
  status: 'active',
  emailVerified: true,
  phoneVerified: true,
  mfaEnabled: false,
  mfaSatisfiedAt: null,
  kycStatus: 'unverified',
  roles: ['user'],
  expiresAt: '2099-01-01T00:00:00.000Z',
}

function repository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    rateLimit: vi.fn().mockResolvedValue(true),
    registerPendingAccount: vi.fn().mockResolvedValue({
      account: {
        userId: 'user-1',
        status: 'pending' as const,
        emailVerified: false,
        phoneVerified: false,
      },
      challenges: [
        {
          id: 'email-challenge',
          kind: 'email' as const,
          expiresAt: '2099-01-01T00:00:00.000Z',
          resendAvailableAt: '2099-01-01T00:00:00.000Z',
        },
        {
          id: 'phone-challenge',
          kind: 'phone' as const,
          expiresAt: '2099-01-01T00:00:00.000Z',
          resendAvailableAt: '2099-01-01T00:00:00.000Z',
        },
      ],
    }),
    issueVerification: vi.fn(async (_userId: string, kind: VerificationKind) => ({
      id: `${kind}-challenge-2`,
      kind,
      expiresAt: '2099-01-01T00:00:00.000Z',
      resendAvailableAt: '2099-01-01T00:00:00.000Z',
    })),
    verifyChallenge: vi.fn().mockResolvedValue(liveSession),
    signIn: vi.fn().mockResolvedValue(liveSession),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(true),
    beginOAuth: vi.fn(async (provider: OAuthProvider) => ({
      provider,
      authorizationUrl: 'https://identity.example/authorize',
      state: 'opaque-state',
    })),
    completeOAuth: vi.fn(async () => liveSession),
    enrollMfa: vi.fn().mockResolvedValue({
      enrollmentId: 'mfa-1',
      provisioningUri: 'otpauth://totp/test',
      recoveryCodes: ['one'],
    }),
    verifyMfa: vi.fn().mockResolvedValue({ ...liveSession, mfaEnabled: true }),
    disableMfa: vi.fn().mockResolvedValue(true),
    redeemRecoveryCode: vi.fn().mockResolvedValue(liveSession),
    recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const validRegistration = {
  fullName: 'Ada Nwosu',
  email: 'ada@example.com',
  phone: '+2348001234567',
  password: 'Strong-pass-2026',
  passwordConfirmation: 'Strong-pass-2026',
  termsAccepted: true,
  privacyAccepted: true,
  termsVersion: '2026-08-21',
  privacyVersion: '2026-08-21',
}

describe('AuthService', () => {
  it('does not create an account when validation fails', async () => {
    const repo = repository()
    const result = await new AuthService(repo).register({
      ...validRegistration,
      password: 'weak',
      passwordConfirmation: 'weak',
    })
    expect(result.ok).toBe(false)
    expect(repo.registerPendingAccount).not.toHaveBeenCalled()
  })

  it('creates the pending account and verification challenges in one repository operation', async () => {
    const repo = repository()
    const result = await new AuthService(repo).register(validRegistration)
    expect(result.ok).toBe(true)
    expect(repo.registerPendingAccount).toHaveBeenCalledTimes(1)
    expect(repo.issueVerification).not.toHaveBeenCalled()
    expect(result.data?.challenges).toHaveLength(2)
  })

  it('rate-limits verification resends before issuing a new challenge', async () => {
    const repo = repository({ rateLimit: vi.fn().mockResolvedValue(false) })
    const result = await new AuthService(repo).resendVerification('user-1', 'phone')
    expect(result.ok).toBe(false)
    expect(repo.issueVerification).not.toHaveBeenCalled()
  })

  it('rejects malformed OTP before the repository can consume a challenge', async () => {
    const repo = repository()
    const result = await new AuthService(repo).verify('user-1', 'challenge-1', 'phone', '12ab')
    expect(result.ok).toBe(false)
    expect(repo.verifyChallenge).not.toHaveBeenCalled()
  })

  it('uses non-enumerating password recovery responses', async () => {
    const repo = repository({
      requestPasswordReset: vi.fn().mockRejectedValue(new Error('not found')),
    })
    const result = await new AuthService(repo).requestPasswordReset('missing@example.com')
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/if the account exists/i)
  })

  it('requires OAuth state, nonce, code and PKCE verifier before completion', async () => {
    const repo = repository()
    const result = await new AuthService(repo).completeOAuth({
      provider: 'google',
      code: '',
      state: '',
      nonce: '',
      codeVerifier: '',
    })
    expect(result.ok).toBe(false)
    expect(repo.completeOAuth).not.toHaveBeenCalled()
  })

  it('delegates server-side session revocation on logout', async () => {
    const repo = repository()
    await new AuthService(repo).logout('session-1')
    expect(repo.revokeSession).toHaveBeenCalledWith('session-1')
  })
})
