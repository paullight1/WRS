import { HttpError, parseCookies, serializeCookie } from './http.js'
import { authPublic, serviceRest } from './supabase.js'

const ACCESS_COOKIE = 'wrs_at'
const REFRESH_COOKIE = 'wrs_rt'
const REMEMBER_COOKIE = 'wrs_rm'

function decodeJwt(jwt) {
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
  const { data: links } = await serviceRest(`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role_id`)
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

export async function buildAppSession(user, accessToken) {
  if (!user?.id) return null
  const [profile, roles, mfaEnabled] = await Promise.all([loadProfile(user.id), loadRoles(user.id), hasVerifiedMfa(user.id)])
  if (!profile) return null
  const claims = decodeJwt(accessToken)
  const issuedAt = Number(claims.iat || 0)
  const expiresAt = Number(claims.exp || 0)
  return {
    id: claims.session_id || `${user.id}:${issuedAt || 'session'}`,
    userId: user.id,
    status: profile.status || 'pending',
    emailVerified: Boolean(profile.email_verified_at),
    phoneVerified: Boolean(profile.phone_verified_at),
    mfaEnabled,
    mfaSatisfiedAt:
      mfaEnabled && claims.aal === 'aal2' && issuedAt ? new Date(issuedAt * 1000).toISOString() : null,
    kycStatus: profile.kyc_status || 'unverified',
    roles,
    expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : new Date(Date.now() + 3600_000).toISOString(),
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
  let user = await validateAccess(accessToken)
  let rotatedCookies = []

  if (!user && refreshToken) {
    try {
      const { data } = await authPublic('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        exposeError: false,
        errorMessage: 'Session refresh failed.',
      })
      accessToken = data.access_token
      user = data.user || (await validateAccess(accessToken))
      if (user) rotatedCookies = sessionCookies(data, rememberMe)
    } catch {
      return { session: null, user: null, accessToken: '', cookies: clearSessionCookies() }
    }
  }

  if (!user) return { session: null, user: null, accessToken: '', cookies: [] }
  const session = await buildAppSession(user, accessToken)
  return { session, user, accessToken, cookies: rotatedCookies, rememberMe }
}

export async function requireSession(request, options = {}) {
  const resolved = await resolveSession(request)
  if (!resolved.user || !resolved.session) throw new HttpError(401, 'Authentication is required.', 'unauthenticated')
  if (resolved.session.status === 'suspended' || resolved.session.status === 'deleted') {
    throw new HttpError(403, 'This account is not active.', 'account-blocked')
  }
  if (options.verified && (!resolved.session.emailVerified || !resolved.session.phoneVerified)) {
    throw new HttpError(403, 'Email and phone verification are required.', 'verification-required')
  }
  if (options.kyc && resolved.session.kycStatus !== 'verified') {
    throw new HttpError(403, 'Identity verification is required.', 'kyc-required')
  }
  return resolved
}
