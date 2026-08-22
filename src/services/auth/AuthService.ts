import type {
  AccountSummary,
  AuthResult,
  AuthSession,
  MfaEnrollment,
  NormalizedRegistration,
  OAuthCallbackInput,
  OAuthProvider,
  OAuthStart,
  RegistrationInput,
  VerificationChallenge,
  VerificationKind,
} from '../../domain/auth/types'
import { passwordIssues, validateOtp, validateRegistration } from '../../domain/auth/validation'

export interface AuthRepository {
  rateLimit(action: string, subject: string): Promise<boolean>
  registerPendingAccount(input: NormalizedRegistration): Promise<{
    account: AccountSummary
    challenges: VerificationChallenge[]
  }>
  issueVerification(userId: string, kind: VerificationKind): Promise<VerificationChallenge>
  verifyChallenge(
    userId: string,
    challengeId: string,
    kind: VerificationKind,
    code: string,
  ): Promise<AuthSession | null>
  signIn(identifier: string, password: string, rememberMe: boolean): Promise<AuthSession | null>
  revokeSession(sessionId: string): Promise<void>
  requestPasswordReset(identifier: string): Promise<void>
  resetPassword(token: string, password: string): Promise<boolean>
  beginOAuth(provider: OAuthProvider, redirectUri: string): Promise<OAuthStart>
  completeOAuth(input: OAuthCallbackInput): Promise<AuthSession | null>
  enrollMfa(sessionId: string): Promise<MfaEnrollment>
  verifyMfa(sessionId: string, enrollmentId: string, code: string): Promise<AuthSession | null>
  disableMfa(sessionId: string, code: string): Promise<boolean>
  redeemRecoveryCode(sessionId: string, code: string): Promise<AuthSession | null>
  recordSecurityEvent(userId: string | null, event: string, metadata?: Record<string, unknown>): Promise<void>
}

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(
    input: RegistrationInput,
  ): Promise<AuthResult<{ account: AccountSummary; challenges: VerificationChallenge[] }>> {
    const checked = validateRegistration(input)
    if (!checked.valid || !checked.normalized) {
      return {
        ok: false,
        code: 'invalid-registration',
        message: checked.issues[0]?.message,
      }
    }

    const subject = `${checked.normalized.normalizedEmail}:${checked.normalized.normalizedPhone}`
    if (!(await this.repository.rateLimit('register', subject))) {
      return { ok: false, code: 'rate-limited', message: 'Try again later.' }
    }

    try {
      const result = await this.repository.registerPendingAccount(checked.normalized)
      await this.repository.recordSecurityEvent(result.account.userId, 'account.registered')
      return { ok: true, data: result }
    } catch {
      return {
        ok: false,
        code: 'registration-unavailable',
        message: 'Unable to create the account right now.',
      }
    }
  }

  async resendVerification(userId: string, kind: VerificationKind): Promise<AuthResult<VerificationChallenge>> {
    if (!(await this.repository.rateLimit(`verification-resend:${kind}`, userId))) {
      return { ok: false, code: 'rate-limited', message: 'Please wait before requesting another code.' }
    }
    try {
      const challenge = await this.repository.issueVerification(userId, kind)
      await this.repository.recordSecurityEvent(userId, 'verification.resent', { kind })
      return { ok: true, data: challenge }
    } catch {
      return { ok: false, code: 'verification-unavailable', message: 'Unable to resend right now.' }
    }
  }

  async verify(
    userId: string,
    challengeId: string,
    kind: VerificationKind,
    code: string,
  ): Promise<AuthResult<AuthSession>> {
    if (!validateOtp(code)) {
      return { ok: false, code: 'invalid-code', message: 'Enter the six-digit verification code.' }
    }
    if (!(await this.repository.rateLimit(`verify:${kind}`, userId))) {
      return { ok: false, code: 'rate-limited', message: 'Too many attempts.' }
    }

    const session = await this.repository.verifyChallenge(userId, challengeId, kind, code)
    if (!session) {
      await this.repository.recordSecurityEvent(userId, 'verification.failed', { kind })
      return {
        ok: false,
        code: 'verification-failed',
        message: 'The code is invalid or expired.',
      }
    }
    await this.repository.recordSecurityEvent(userId, 'verification.succeeded', { kind })
    return { ok: true, data: session }
  }

  async login(identifier: string, password: string, rememberMe = false): Promise<AuthResult<AuthSession>> {
    if (!(await this.repository.rateLimit('login', identifier.trim().toLowerCase()))) {
      return { ok: false, code: 'rate-limited', message: 'Try again later.' }
    }
    const session = await this.repository.signIn(identifier.trim(), password, rememberMe)
    if (!session) {
      await this.repository.recordSecurityEvent(null, 'login.failed')
      return {
        ok: false,
        code: 'invalid-credentials',
        message: 'Email/phone or password is incorrect.',
      }
    }
    await this.repository.recordSecurityEvent(session.userId, 'login.succeeded')
    return { ok: true, data: session }
  }

  async logout(sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId)
  }

  async requestPasswordReset(identifier: string): Promise<AuthResult<null>> {
    await this.repository.rateLimit('password-reset', identifier.trim().toLowerCase())
    try {
      await this.repository.requestPasswordReset(identifier.trim())
    } catch {
      // Intentionally non-enumerating.
    }
    return {
      ok: true,
      data: null,
      message: 'If the account exists, recovery instructions were sent.',
    }
  }

  async resetPassword(token: string, password: string): Promise<AuthResult<null>> {
    const issues = passwordIssues(password)
    if (issues.length) {
      return {
        ok: false,
        code: 'weak-password',
        message: `Password must contain ${issues.join(', ')}.`,
      }
    }
    const changed = await this.repository.resetPassword(token, password)
    return changed
      ? { ok: true, data: null }
      : { ok: false, code: 'invalid-reset', message: 'Reset link is invalid or expired.' }
  }

  beginOAuth(provider: OAuthProvider, redirectUri: string): Promise<OAuthStart> {
    return this.repository.beginOAuth(provider, redirectUri)
  }

  async completeOAuth(input: OAuthCallbackInput): Promise<AuthResult<AuthSession>> {
    if (!input.state || !input.nonce || !input.code || !input.codeVerifier) {
      return { ok: false, code: 'invalid-oauth-state', message: 'OAuth verification failed.' }
    }
    const session = await this.repository.completeOAuth(input)
    return session
      ? { ok: true, data: session }
      : { ok: false, code: 'oauth-failed', message: 'Social sign-in could not be verified.' }
  }

  enrollMfa(sessionId: string): Promise<MfaEnrollment> {
    return this.repository.enrollMfa(sessionId)
  }

  async verifyMfa(sessionId: string, enrollmentId: string, code: string): Promise<AuthResult<AuthSession>> {
    if (!validateOtp(code)) {
      return { ok: false, code: 'invalid-factor', message: 'Enter a valid factor.' }
    }
    const session = await this.repository.verifyMfa(sessionId, enrollmentId, code)
    return session
      ? { ok: true, data: session }
      : { ok: false, code: 'invalid-factor', message: 'Factor verification failed.' }
  }

  disableMfa(sessionId: string, code: string): Promise<boolean> {
    return this.repository.disableMfa(sessionId, code)
  }

  async useRecoveryCode(sessionId: string, code: string): Promise<AuthResult<AuthSession>> {
    const session = await this.repository.redeemRecoveryCode(sessionId, code.trim())
    return session
      ? { ok: true, data: session }
      : {
          ok: false,
          code: 'invalid-recovery-code',
          message: 'Recovery code is invalid or already used.',
        }
  }
}
