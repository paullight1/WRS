import { randomBytes } from 'node:crypto'
import { sha256 } from './crypto.js'
import { HttpError } from './http.js'
import { recordSecurityEvent } from './auth.js'
import { buildAppSession, sessionCookies } from './session.js'
import { authPublic, authSecret, serviceRest } from './supabase.js'

function recoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8).toString('hex').toUpperCase()
    return `WRS-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`
  })
}

async function storeFactor(userId, providerFactorId, status = 'pending') {
  await serviceRest('/rest/v1/user_mfa_factors', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      user_id: userId,
      provider_factor_id: providerFactorId,
      kind: 'totp',
      status,
      verified_at: status === 'verified' ? new Date().toISOString() : null,
    },
  })
}

async function loadFactor(userId, factorId = null) {
  const filter = factorId
    ? `provider_factor_id=eq.${encodeURIComponent(factorId)}`
    : 'status=eq.verified'
  const { data } = await serviceRest(
    `/rest/v1/user_mfa_factors?user_id=eq.${encodeURIComponent(userId)}&${filter}&select=*&order=created_at.desc&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

async function challengeAndVerify(accessToken, factorId, code) {
  const challenge = await authPublic(`/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, {
    method: 'POST',
    token: accessToken,
    body: {},
    exposeError: false,
    errorMessage: 'Factor challenge failed.',
  })
  const challengeId = challenge.data?.id
  if (!challengeId) throw new HttpError(502, 'Factor challenge did not return an ID.', 'mfa-unavailable')
  const verified = await authPublic(`/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, {
    method: 'POST',
    token: accessToken,
    body: { challenge_id: challengeId, code },
    exposeError: false,
    errorMessage: 'Factor verification failed.',
  })
  return verified.data
}

export async function enrollMfa(resolved) {
  const existing = await loadFactor(resolved.user.id)
  if (existing) throw new HttpError(409, 'A verified authenticator is already enrolled.', 'mfa-already-enabled')

  const result = await authPublic('/auth/v1/factors', {
    method: 'POST',
    token: resolved.accessToken,
    body: { factor_type: 'totp', friendly_name: 'WRS Authenticator' },
    exposeError: false,
    errorMessage: 'Authenticator enrollment failed.',
  })
  const factor = result.data
  const factorId = factor?.id
  const provisioningUri = factor?.totp?.uri || factor?.totp?.qr_code || ''
  if (!factorId || !provisioningUri) throw new HttpError(502, 'Authenticator enrollment is incomplete.', 'mfa-unavailable')

  await storeFactor(resolved.user.id, factorId, 'pending')
  const codes = recoveryCodes()
  await serviceRest('/rest/v1/mfa_recovery_codes', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: codes.map((code) => ({ user_id: resolved.user.id, code_hash: sha256(code) })),
  })
  await recordSecurityEvent(resolved.user.id, 'mfa.enrollment.started')
  return { enrollmentId: factorId, provisioningUri, recoveryCodes: codes }
}

export async function verifyMfa(resolved, enrollmentId, code) {
  if (!/^\d{6}$/.test(String(code || '').trim())) throw new HttpError(400, 'Enter a six-digit factor.', 'invalid-factor')
  const factor = await loadFactor(resolved.user.id, enrollmentId)
  if (!factor || factor.status === 'disabled') throw new HttpError(404, 'Authenticator enrollment was not found.', 'invalid-factor')
  let tokenResponse
  try {
    tokenResponse = await challengeAndVerify(resolved.accessToken, enrollmentId, String(code).trim())
  } catch {
    await recordSecurityEvent(resolved.user.id, 'mfa.verification.failed').catch(() => undefined)
    throw new HttpError(400, 'Factor verification failed.', 'invalid-factor')
  }
  await serviceRest(`/rest/v1/user_mfa_factors?user_id=eq.${encodeURIComponent(resolved.user.id)}&provider_factor_id=eq.${encodeURIComponent(enrollmentId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { status: 'verified', verified_at: new Date().toISOString(), disabled_at: null },
  })
  const user = tokenResponse.user || resolved.user
  const accessToken = tokenResponse.access_token || resolved.accessToken
  const session = await buildAppSession(user, accessToken)
  await recordSecurityEvent(resolved.user.id, 'mfa.enabled')
  return {
    session,
    cookies: tokenResponse.access_token ? sessionCookies(tokenResponse, resolved.rememberMe) : resolved.cookies,
  }
}

async function consumeRecoveryCode(userId, code) {
  const hash = sha256(String(code || '').trim().toUpperCase())
  const { data } = await serviceRest(
    `/rest/v1/mfa_recovery_codes?user_id=eq.${encodeURIComponent(userId)}&code_hash=eq.${encodeURIComponent(hash)}&used_at=is.null&select=id&limit=1`,
  )
  const row = Array.isArray(data) ? data[0] || null : null
  if (!row) return false
  await serviceRest(`/rest/v1/mfa_recovery_codes?id=eq.${encodeURIComponent(row.id)}&used_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { used_at: new Date().toISOString() },
  })
  return true
}

async function invalidateRecoveryCodes(userId) {
  await serviceRest(`/rest/v1/mfa_recovery_codes?user_id=eq.${encodeURIComponent(userId)}&used_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { used_at: new Date().toISOString() },
  })
}

export async function disableMfa(resolved, code) {
  const factor = await loadFactor(resolved.user.id)
  if (!factor) throw new HttpError(404, 'No verified authenticator is enrolled.', 'mfa-not-enabled')

  let tokenResponse = null
  if (/^\d{6}$/.test(String(code || '').trim())) {
    tokenResponse = await challengeAndVerify(resolved.accessToken, factor.provider_factor_id, String(code).trim())
    await authPublic(`/auth/v1/factors/${encodeURIComponent(factor.provider_factor_id)}`, {
      method: 'DELETE',
      token: tokenResponse.access_token || resolved.accessToken,
      exposeError: false,
      errorMessage: 'Authenticator could not be disabled.',
    })
  } else {
    const recovered = await consumeRecoveryCode(resolved.user.id, code)
    if (!recovered) throw new HttpError(400, 'Current factor or recovery code is invalid.', 'invalid-factor')
    await authSecret(`/auth/v1/admin/users/${encodeURIComponent(resolved.user.id)}/factors/${encodeURIComponent(factor.provider_factor_id)}`, {
      method: 'DELETE',
      errorMessage: 'Authenticator could not be disabled.',
    })
  }

  await serviceRest(`/rest/v1/user_mfa_factors?user_id=eq.${encodeURIComponent(resolved.user.id)}&provider_factor_id=eq.${encodeURIComponent(factor.provider_factor_id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { status: 'disabled', disabled_at: new Date().toISOString() },
  })
  await invalidateRecoveryCodes(resolved.user.id)
  const accessToken = tokenResponse?.access_token || resolved.accessToken
  const user = tokenResponse?.user || resolved.user
  const session = await buildAppSession(user, accessToken)
  await recordSecurityEvent(resolved.user.id, 'mfa.disabled')
  return {
    session,
    cookies: tokenResponse?.access_token ? sessionCookies(tokenResponse, resolved.rememberMe) : resolved.cookies,
  }
}
