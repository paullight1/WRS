import { randomUUID } from 'node:crypto'
import { hmac, randomToken, sha256, signedToken, verifySignedToken } from './crypto.js'
import { HttpError } from './http.js'
import { authPublic, serviceRest, serviceRpc } from './supabase.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const E164 = /^\+[1-9]\d{7,14}$/
const OTP = /^\d{6}$/
const CHALLENGE_TTL_MS = 10 * 60_000
const RESEND_COOLDOWN_MS = 60_000

function challengeSecret() {
  const secret = process.env.WRS_AUTH_CHALLENGE_SECRET || process.env.WRS_SERVER_SIGNING_SECRET
  if (!secret) throw new HttpError(503, 'Verification signing is not configured.', 'verification-unavailable')
  return secret
}

function rateLimitSecret() {
  const secret = process.env.WRS_RATE_LIMIT_SECRET || process.env.WRS_SERVER_SIGNING_SECRET
  if (!secret) throw new HttpError(503, 'Rate limiting is not configured.', 'rate-limit-unavailable')
  return secret
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function normalizePhone(value) {
  return String(value || '')
    .replace(/[\s()-]/g, '')
    .trim()
}

function legacyPhonePlaceholder(userId) {
  const digits = sha256(String(userId)).replace(/\D/g, '').slice(0, 12).padEnd(12, '7')
  return `+999${digits}`
}

export function passwordIssues(password) {
  const value = String(password || '')
  const issues = []
  if (value.length < 12) issues.push('at least 12 characters')
  if (!/[a-z]/.test(value)) issues.push('a lowercase letter')
  if (!/[A-Z]/.test(value)) issues.push('an uppercase letter')
  if (!/\d/.test(value)) issues.push('a number')
  if (!/[^A-Za-z0-9]/.test(value)) issues.push('a symbol')
  return issues
}

export function validateRegistration(input) {
  const fullName = String(input?.fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
  const email = normalizeEmail(input?.email)
  const phone = normalizePhone(input?.phone || '')
  const password = String(input?.password || '')
  const confirmation = String(input?.passwordConfirmation || '')
  if (fullName.length < 2) throw new HttpError(400, 'Enter your full name.', 'invalid-registration')
  if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email address.', 'invalid-registration')
  const issues = passwordIssues(password)
  if (issues.length) throw new HttpError(400, `Password must contain ${issues.join(', ')}.`, 'invalid-registration')
  if (password !== confirmation) throw new HttpError(400, 'Passwords do not match.', 'invalid-registration')
  if (input?.termsAccepted !== true || input?.privacyAccepted !== true) {
    throw new HttpError(400, 'Terms and Privacy acceptance are required.', 'invalid-registration')
  }
  const termsVersion = String(input?.termsVersion || '').trim()
  const privacyVersion = String(input?.privacyVersion || '').trim()
  if (!termsVersion || !privacyVersion)
    throw new HttpError(400, 'Legal notice versions are required.', 'invalid-registration')
  return {
    fullName,
    email,
    phone,
    password,
    termsVersion,
    privacyVersion,
    referralCode: String(input?.referralCode || '').trim() || null,
  }
}

export async function enforceRateLimit(request, action, subject, limit, windowSeconds) {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const ip = forwarded.split(',')[0].trim()
  const digest = hmac(
    `${action}|${String(subject || '')
      .trim()
      .toLowerCase()}|${ip}`,
    rateLimitSecret(),
  )
  const { data } = await serviceRpc('wrs_consume_auth_rate_limit', {
    p_action: action,
    p_subject_hash: digest,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  })
  if (data !== true) throw new HttpError(429, 'Too many attempts. Try again later.', 'rate-limited')
}

export async function recordSecurityEvent(userId, eventType, metadata = {}) {
  await serviceRest('/rest/v1/security_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      user_id: userId || null,
      event_type: eventType,
      metadata,
    },
  })
}

export async function loadProfile(userId) {
  const { data } = await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  return Array.isArray(data) ? data[0] || null : null
}

export async function loadProfileByIdentifier(identifier) {
  const raw = String(identifier || '').trim()
  if (!raw) return null
  const isEmail = raw.includes('@')
  const column = isEmail ? 'normalized_email' : 'normalized_phone'
  const value = isEmail ? normalizeEmail(raw) : normalizePhone(raw)
  const { data } = await serviceRest(
    `/rest/v1/user_profiles?${column}=eq.${encodeURIComponent(value)}&select=*&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

async function issueProviderOtp(kind, contact) {
  const body = kind === 'email' ? { email: contact, create_user: false } : { phone: contact, create_user: false }
  try {
    await authPublic('/auth/v1/otp', {
      method: 'POST',
      body,
      exposeError: false,
      errorMessage: 'Verification delivery is unavailable.',
    })
  } catch (error) {
    const providerCode = error?.upstreamData?.error_code
    if (providerCode === 'otp_disabled' || error?.message === 'Verification delivery is unavailable.') {
      throw new HttpError(
        503,
        `Supabase ${kind} OTP delivery is disabled. Enable the ${kind} provider in Supabase Auth before registering users.`,
        'verification-provider-disabled',
      )
    }
    if (error?.upstreamStatus >= 500) {
      throw new HttpError(
        503,
        `Supabase ${kind} OTP delivery is unavailable. Check the provider configuration.`,
        'verification-provider-unavailable',
      )
    }
    throw error
  }
}

async function insertChallengeRow(userId, kind, ref, expiresAt, resendAvailableAt) {
  const id = randomUUID()
  await serviceRest('/rest/v1/verification_requests', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      id,
      user_id: userId,
      kind,
      secret_hash: sha256(ref),
      expires_at: expiresAt.toISOString(),
      resend_available_at: resendAvailableAt.toISOString(),
    },
  })
  return id
}

export async function issueVerificationChallenge(userId, kind, contact) {
  if (!['email', 'phone'].includes(kind))
    throw new HttpError(400, 'Verification kind is invalid.', 'invalid-verification')
  const ref = randomToken(24)
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
  const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN_MS)
  const id = await insertChallengeRow(userId, kind, ref, expiresAt, resendAvailableAt)
  try {
    await issueProviderOtp(kind, contact)
  } catch (error) {
    await serviceRest(`/rest/v1/verification_requests?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { superseded_at: new Date().toISOString() },
    }).catch(() => undefined)
    throw error
  }
  const token = signedToken({ v: 1, id, userId, kind, ref, exp: expiresAt.getTime() }, challengeSecret())
  return { id: token, kind, expiresAt: expiresAt.toISOString(), resendAvailableAt: resendAvailableAt.toISOString() }
}

async function consumeChallengeAttempt(userId, kind, token) {
  const payload = verifySignedToken(token, challengeSecret())
  if (
    payload?.v !== 1 ||
    payload.userId !== userId ||
    payload.kind !== kind ||
    !payload.id ||
    !payload.ref ||
    Number(payload.exp || 0) <= Date.now()
  ) {
    throw new HttpError(400, 'Verification challenge is invalid or expired.', 'invalid-challenge')
  }
  const { data: accepted } = await serviceRpc('wrs_consume_verification_attempt', {
    p_request_id: payload.id,
    p_user_id: userId,
    p_kind: kind,
    p_secret_hash: sha256(payload.ref),
  })
  if (accepted !== true) {
    throw new HttpError(400, 'Verification challenge is invalid or expired.', 'invalid-challenge')
  }
  return payload
}

async function markChallengeConsumed(id) {
  await serviceRest(`/rest/v1/verification_requests?id=eq.${encodeURIComponent(id)}&consumed_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { consumed_at: new Date().toISOString() },
  })
}

async function markProfileVerified(userId, kind) {
  const field = kind === 'email' ? 'email_verified_at' : 'phone_verified_at'
  await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { [field]: new Date().toISOString(), updated_at: new Date().toISOString() },
  })
  const profile = await loadProfile(userId)
  if (profile?.email_verified_at && profile.status === 'pending') {
    await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { status: 'active', updated_at: new Date().toISOString() },
    })
  }
}

export async function verifyChallenge(userId, kind, challengeToken, code) {
  const normalizedCode = String(code || '').trim()
  if (!OTP.test(normalizedCode)) throw new HttpError(400, 'Enter the six-digit verification code.', 'invalid-code')
  const challenge = await consumeChallengeAttempt(userId, kind, challengeToken)
  const profile = await loadProfile(userId)
  if (!profile) throw new HttpError(404, 'Account verification context is unavailable.', 'verification-unavailable')
  const contact = kind === 'email' ? profile.normalized_email : profile.normalized_phone
  const body =
    kind === 'email'
      ? { email: contact, token: normalizedCode, type: 'email' }
      : { phone: contact, token: normalizedCode, type: 'sms' }
  let tokenResponse
  try {
    const { data } = await authPublic('/auth/v1/verify', {
      method: 'POST',
      body,
      exposeError: false,
      errorMessage: 'The code is invalid or expired.',
    })
    tokenResponse = data
  } catch {
    await recordSecurityEvent(userId, 'verification.failed', { kind }).catch(() => undefined)
    throw new HttpError(400, 'The code is invalid or expired.', 'verification-failed')
  }
  await markChallengeConsumed(challenge.id)
  await markProfileVerified(userId, kind)
  await recordSecurityEvent(userId, 'verification.succeeded', { kind })
  return tokenResponse
}

export async function resendVerification(userId, kind) {
  const profile = await loadProfile(userId)
  if (!profile) throw new HttpError(404, 'Verification context is unavailable.', 'verification-unavailable')
  const { data } = await serviceRest(
    `/rest/v1/verification_requests?user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&consumed_at=is.null&superseded_at=is.null&select=id,resend_available_at&order=created_at.desc&limit=1`,
  )
  const current = Array.isArray(data) ? data[0] || null : null
  if (current && new Date(current.resend_available_at).getTime() > Date.now()) {
    throw new HttpError(429, 'Please wait before requesting another code.', 'resend-cooldown')
  }
  await supersedeOpenChallenges(userId, kind)
  const contact = kind === 'email' ? profile.normalized_email : profile.normalized_phone
  return issueVerificationChallenge(userId, kind, contact)
}

async function supersedeOpenChallenges(userId, kind) {
  await serviceRest(
    `/rest/v1/verification_requests?user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&consumed_at=is.null&superseded_at=is.null`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { superseded_at: new Date().toISOString() },
    },
  )
}

export async function createPendingAccount(registration, emailRedirectTo) {
  let authUser = null
  try {
    const { data } = await authPublic(`/auth/v1/signup?redirect_to=${encodeURIComponent(emailRedirectTo)}`, {
      method: 'POST',
      body: {
        email: registration.email,
        password: registration.password,
        data: {
          full_name: registration.fullName,
          terms_version: registration.termsVersion,
          privacy_version: registration.privacyVersion,
        },
      },
      errorMessage: 'Unable to create the account.',
    })
    authUser = data?.user || data
    if (!authUser?.id)
      throw new HttpError(502, 'Identity provider did not create an account.', 'registration-unavailable')

    const profileBody = {
        user_id: authUser.id,
        full_name: registration.fullName,
        normalized_email: registration.email,
        normalized_phone: registration.phone || null,
        status: 'pending',
        terms_version: registration.termsVersion,
        privacy_version: registration.privacyVersion,
        legal_accepted_at: new Date().toISOString(),
    }
    try {
      await serviceRest('/rest/v1/user_profiles', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: profileBody,
      })
    } catch (error) {
      // Older deployed schemas still require an E.164 phone value. Keep the
      // email-only UX working until the nullable-phone migration is applied;
      // this synthetic value is never shown or used for verification.
      if (!(error instanceof HttpError) || error.status !== 400) throw error
      await serviceRest('/rest/v1/user_profiles', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: { ...profileBody, normalized_phone: legacyPhonePlaceholder(authUser.id) },
      })
    }

    await recordSecurityEvent(authUser.id, 'account.registered')
    return { userId: authUser.id, email: registration.email, confirmationRequired: true, challenges: [] }
  } catch (error) {
    const providerMessage = String(error?.upstreamData?.msg || error?.message || '').toLowerCase()
    if (providerMessage.includes('sending confirmation email') || providerMessage.includes('email address not authorized')) {
      throw new HttpError(
        503,
        'Supabase could not send the confirmation email. Configure a working SMTP provider in Auth Email settings, or use an authorized test address.',
        'confirmation-email-unavailable',
      )
    }
    if (error instanceof HttpError && error.upstreamStatus === 400) {
      const detail = String(
        error.upstreamData?.message || error.upstreamData?.msg || error.upstreamData?.details || 'profile data was rejected',
      )
      throw new HttpError(502, `Supabase rejected the account profile: ${detail}`, 'profile-setup-failed')
    }
    if (error instanceof HttpError && error.status >= 500) throw error
    if (error instanceof HttpError && error.status === 400) throw error
    throw new HttpError(503, 'Unable to create the account right now.', 'registration-unavailable')
  }
}

export async function issueMissingVerificationChallenges(user) {
  if (!user?.id) return []
  const profile = await loadProfile(user.id)
  if (!profile) return []
  if (!profile.email_verified_at) return [await replaceChallenge(user.id, 'email', profile.normalized_email)]
  return []
}

async function replaceChallenge(userId, kind, contact) {
  await supersedeOpenChallenges(userId, kind)
  return issueVerificationChallenge(userId, kind, contact)
}
