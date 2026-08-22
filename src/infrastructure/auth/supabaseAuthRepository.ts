import type {
  AccountSummary,
  AuthSession,
  MfaEnrollment,
  NormalizedRegistration,
  OAuthCallbackInput,
  OAuthProvider,
  OAuthStart,
  VerificationChallenge,
  VerificationKind,
} from '../../domain/auth/types'
import type { AuthRepository } from '../../services/auth/AuthService'

export interface SupabaseServerPort {
  call<T>(operation: string, payload: Record<string, unknown>): Promise<T>
}

/**
 * Server-side Supabase adapter. It intentionally has no browser token-storage
 * implementation: WRS production clients talk to same-origin auth endpoints
 * that own secure HTTP-only session cookies. The server endpoint injects its
 * Supabase/Auth implementation through this port.
 */
export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly port: SupabaseServerPort) {}

  rateLimit(action: string, subject: string) {
    return this.port.call<boolean>('auth.rateLimit', { action, subject })
  }

  registerPendingAccount(input: NormalizedRegistration) {
    return this.port.call<{ account: AccountSummary; challenges: VerificationChallenge[] }>('auth.registerAtomic', {
      input,
    })
  }

  issueVerification(userId: string, kind: VerificationKind) {
    return this.port.call<VerificationChallenge>('auth.issueVerification', { userId, kind })
  }

  verifyChallenge(userId: string, challengeId: string, kind: VerificationKind, code: string) {
    return this.port.call<AuthSession | null>('auth.verifyChallenge', {
      userId,
      challengeId,
      kind,
      code,
    })
  }

  signIn(identifier: string, password: string, rememberMe: boolean) {
    return this.port.call<AuthSession | null>('auth.signIn', {
      identifier,
      password,
      rememberMe,
    })
  }

  revokeSession(sessionId: string) {
    return this.port.call<void>('auth.revokeSession', { sessionId })
  }

  requestPasswordReset(identifier: string) {
    return this.port.call<void>('auth.requestPasswordReset', { identifier })
  }

  resetPassword(token: string, password: string) {
    return this.port.call<boolean>('auth.resetPassword', { token, password })
  }

  beginOAuth(provider: OAuthProvider, redirectUri: string) {
    return this.port.call<OAuthStart>('auth.beginOAuth', {
      provider,
      redirectUri,
      pkce: true,
      requireState: true,
      requireNonce: true,
    })
  }

  completeOAuth(input: OAuthCallbackInput) {
    return this.port.call<AuthSession | null>('auth.completeOAuth', { ...input, pkce: true })
  }

  enrollMfa(sessionId: string) {
    return this.port.call<MfaEnrollment>('auth.enrollMfa', { sessionId, type: 'totp' })
  }

  verifyMfa(sessionId: string, enrollmentId: string, code: string) {
    return this.port.call<AuthSession | null>('auth.verifyMfa', {
      sessionId,
      enrollmentId,
      code,
    })
  }

  disableMfa(sessionId: string, code: string) {
    return this.port.call<boolean>('auth.disableMfa', { sessionId, code })
  }

  redeemRecoveryCode(sessionId: string, code: string) {
    return this.port.call<AuthSession | null>('auth.redeemRecoveryCode', { sessionId, code })
  }

  recordSecurityEvent(userId: string | null, event: string, metadata: Record<string, unknown> = {}) {
    return this.port.call<void>('auth.securityEvent', { userId, event, metadata })
  }
}
