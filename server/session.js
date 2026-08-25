import { HttpError, parseCookies, serializeCookie } from './http.js'
import { authPublic, serviceRest } from './supabase.js'

const ACCESS_COOKIE = 'wrs_at'
const REFRESH_COOKIE = 'wrs_rt'
const REMEMBER_COOKIE = 'wrs_rm'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function decodeAccessClaims(jwt) {
  try {
    const payload = String(jwt).split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

function secureCookies() {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

export function sessionCookies(tokenResponse, rememberMe = false) {
  const secure = secureCookies()
  const accessMaxAge = Math.max(60, Number(tokenResponse.expires_in || 3600))
  const refreshOptions = { secure, sameSite: 'Lax' }
  if (rememberMe) refreshOptions.maxAge = 60 * 60 * 24 * 30
  return [
    serializeCookie(ACCESS_COOKIE, tokenResponse.access_token, { secure, sameSite: 'Lax', maxAge: accessMaxAge }),
    serializeCookie(REFRESH_COOKIE, tokenResponse.refresh_token, refreshOptions),
    serializeCookie(REMEMBER_COOKIE, rememberMe ? '1' : '0', {
      secure,
      sameSite: 'Lax',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
    }),
  ]
}

export function clearSessionCookies() {
  const secure = secureCookies()
  const options = { secure, sameSite: 'Lax', maxAge: 0, expires: new Date(0) }
  return [
    serializeCookie(ACCESS_COOKIE, '', options),
    serializeCookie(REFRESH_COOKIE, '', options),
    serializeCookie(REMEMBER_COOKIE, '', options),
  ]
}

async function loadProfile(userId) {
  const { data } = await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  return Array.isArray(data) ? data[0] || null : null
}

async function loadRoles(userId) {
  const { data: links } = await serviceRest(
    `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role_id`,
  )
  const ids = Array.isArray(links) ? links.map((item) => item.role_id).filter(Boolean) : []
  if (!ids.length) return ['user']
  const encodedIds = ids.map((id) => encodeURIComponent(id)).join(',')
  const { data: rows } = await serviceRest(`/rest/v1/roles?id=in.(${encodedIds})&select=slug`)
  const roles = Array.isArray(rows) ? rows.map((item) => item.slug).filter(Boolean) : []
  return roles.length ? [...new Set(['user', ...roles])] : ['user']
}

async function hasVerifiedMfa(userId) {
  const { data } = await serviceRest(
    `/rest/v1/user_mfa_factors?user_id=eq.${encodeURIComponent(userId)}&status=eq.verified&select=id&limit=1`,
  )
  return Array.isArray(data) && data.length > 0
}

async function hasPendingAccountDeletion(userId) {
  const { data } = await serviceRest(
    `/rest/v1/account_deletion_requests?user_id=eq.${encodeURIComponent(userId)}&status=in.(requested,processing,failed)&select=id&limit=1`,
  )
  return Array.isArray(data) && data.length > 0
}

function authSessionId(accessToken) {
  const sessionId = String(decodeAccessClaims(accessToken).session_id || '')
  return UUID.test(sessionId) ? sessionId : null
}

export async function recordSessionMetadata(userId, accessToken, rememberMe = false) {
  const claims = decodeAccessClaims(accessToken)
  const sessionId = String(claims.session_id || '')
  if (!UUID.test(sessionId)) throw new HttpError(401, 'Provider session identifier is missing.', 'invalid-session')
  const expires = Number(claims.exp || 0)
  const expiresAt = expires ? new Date(expires * 1000) : new Date(Date.now() + 3600_000)
  await serviceRest('/rest/v1/user_sessions?on_conflict=auth_session_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      user_id: userId,
      auth_session_id: sessionId,
      remember_me: rememberMe,
      mfa_satisfied_at:
        claims.aal === 'aal2' && Number(claims.iat || 0) ? new Date(Number(claims.iat) * 1000).toISOString() : null,
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
    },
  })
}

async function sessionMetadata(accessToken) {
  const sessionId = authSessionId(accessToken)
  if (!sessionId) return null
  const { data } = await serviceRest(
    `/rest/v1/user_sessions?auth_session_id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

function metadataIsActive(metadata, userId) {
  return Boolean(
    metadata &&
    metadata.user_id === userId &&
    !metadata.revoked_at &&
    new Date(metadata.expires_at).getTime() > Date.now(),
  )
}

export async function revokeSessionMetadata(accessToken) {
  const sessionId = authSessionId(accessToken)
  if (!sessionId) return
  await serviceRest(`/rest/v1/user_sessions?auth_session_id=eq.${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { revoked_at: new Date().toISOString() },
  })
}

export async function revokeAllUserSessionMetadata(userId) {
  await serviceRest(`/rest/v1/user_sessions?user_id=eq.${encodeURIComponent(userId)}&revoked_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { revoked_at: new Date().toISOString() },
  })
}

export async function buildAppSession(user, accessToken) {
  if (!user?.id) return null
  const [profile, roles, mfaEnabled, metadata, accountDeletionPending] = await Promise.all([
    loadProfile(user.id),
    loadRoles(user.id),
    hasVerifiedMfa(user.id),
    sessionMetadata(accessToken),
    hasPendingAccountDeletion(user.id),
  ])
  if (!profile || !metadataIsActive(metadata, user.id)) return null
  const claims = decodeAccessClaims(accessToken)
  const issuedAt = Number(claims.iat || 0)
  const expiresAt = Number(claims.exp || 0)
  return {
    id: claims.session_id,
    userId: user.id,
    status: profile.status || 'pending',
    emailVerified: Boolean(profile.email_verified_at),
    phoneVerified: Boolean(profile.phone_verified_at),
    mfaEnabled,
    mfaSatisfiedAt: mfaEnabled
      ? claims.aal === 'aal2' && issuedAt
        ? new Date(issuedAt * 1000).toISOString()
        : metadata.mfa_satisfied_at
      : null,
    kycStatus: profile.kyc_status || 'unverified',
    roles,
    accountDeletionPending,
    expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : metadata.expires_at,
  }
}

async function validateAccess(accessToken) {
  if (!accessToken) return null
  try {
    const { data: user } = await authPublic('/auth/v1/user', {
      token: accessToken,
      exposeError: false,
      errorMessage: 'Session is invalid.',
    })
    return user
  } catch {
    return null
  }
}

export async function resolveSession(request) {
  const cookies = parseCookies(request)
  let accessToken = cookies[ACCESS_COOKIE] || ''
  const refreshToken = cookies[REFRESH_COOKIE] || ''
  const rememberMe = cookies[REMEMBER_COOKIE] === '1'
  const previousMetadata = accessToken ? await sessionMetadata(accessToken) : null
  if (previousMetadata?.revoked_at) {
    return { session: null, user: null, accessToken: '', cookies: clearSessionCookies() }
  }

  let user = await validateAccess(accessToken)
  let rotatedCookies = []
  let session = null

  if (user) {
    if (!metadataIsActive(previousMetadata, user.id)) {
      return { session: null, user: null, accessToken: '', cookies: clearSessionCookies() }
    }
    session = await buildAppSession(user, accessToken)
  }

  if (!user && refreshToken) {
    try {
      const oldAccessToken = accessToken
      const { data } = await authPublic('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        exposeError: false,
        errorMessage: 'Session refresh failed.',
      })
      accessToken = data.access_token
      user = data.user || (await validateAccess(accessToken))
      if (user) {
        const oldSessionId = authSessionId(oldAccessToken)
        const newSessionId = authSessionId(accessToken)
        if (oldSessionId && newSessionId && oldSessionId !== newSessionId) {
          await revokeSessionMetadata(oldAccessToken).catch(() => undefined)
        }
        await recordSessionMetadata(user.id, accessToken, rememberMe)
        rotatedCookies = sessionCookies(data, rememberMe)
        session = await buildAppSession(user, accessToken)
      }
    } catch {
      return { session: null, user: null, accessToken: '', cookies: clearSessionCookies() }
    }
  }

  if (!user || !session) {
    return { session: null, user: null, accessToken: '', cookies: clearSessionCookies() }
  }
  return { session, user, accessToken, cookies: rotatedCookies, rememberMe }
}

export async function requireSession(request, options = {}) {
  const resolved = await resolveSession(request)
  if (!resolved.user || !resolved.session) throw new HttpError(401, 'Authentication is required.', 'unauthenticated')
  if (resolved.session.status === 'suspended' || resolved.session.status === 'deleted') {
    throw new HttpError(403, 'This account is not active.', 'account-blocked')
  }
  if (resolved.session.accountDeletionPending && !options.allowDeletionPending) {
    throw new HttpError(
      423,
      'Account deletion is pending. Cancel the request before resuming account activity.',
      'account-deletion-pending',
    )
  }
  if (options.verified && (!resolved.session.emailVerified || !resolved.session.phoneVerified)) {
    throw new HttpError(403, 'Email and phone verification are required.', 'verification-required')
  }
  if (options.kyc && resolved.session.kycStatus !== 'verified') {
    throw new HttpError(403, 'Identity verification is required.', 'kyc-required')
  }
  return resolved
}
