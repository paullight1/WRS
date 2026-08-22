import { randomUUID } from 'node:crypto'
import { randomToken, sha256, signedToken, verifySignedToken } from './crypto.js'
import { HttpError, parseCookies, serializeCookie } from './http.js'
import { loadProfile, recordSecurityEvent } from './auth.js'
import { buildAppSession, recordSessionMetadata, sessionCookies } from './session.js'
import { authPublic, serviceRest, supabaseBaseUrl } from './supabase.js'

const OAUTH_COOKIE = 'wrs_oauth'
const OAUTH_TTL_MS = 10 * 60_000

function secret() {
  const value = process.env.WRS_OAUTH_COOKIE_SECRET || process.env.WRS_SERVER_SIGNING_SECRET
  if (!value) throw new HttpError(503, 'OAuth signing is not configured.', 'oauth-unavailable')
  return value
}

function secureCookie() {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

export function clearOAuthCookie() {
  return serializeCookie(OAUTH_COOKIE, '', {
    secure: secureCookie(),
    sameSite: 'Lax',
    maxAge: 0,
    expires: new Date(0),
  })
}

function allowedProviders() {
  return new Set(
    String(process.env.WRS_OAUTH_PROVIDERS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )
}

export async function beginOAuth(request, provider) {
  const normalized = String(provider || '')
    .trim()
    .toLowerCase()
  if (!['google', 'apple'].includes(normalized) || !allowedProviders().has(normalized)) {
    throw new HttpError(404, 'This OAuth provider is not enabled.', 'oauth-disabled')
  }

  const state = randomToken(32)
  const nonce = randomToken(32)
  const verifier = randomToken(48)
  const codeChallenge = sha256(verifier)
  const expiresAt = new Date(Date.now() + OAUTH_TTL_MS)
  const redirectUri = `${new URL(request.url).origin}/api/auth/oauth/callback`
  const rowId = randomUUID()

  await serviceRest('/rest/v1/oauth_login_states', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      id: rowId,
      provider: normalized,
      state_hash: sha256(state),
      nonce_hash: sha256(nonce),
      pkce_verifier_hash: sha256(verifier),
      redirect_uri: redirectUri,
      expires_at: expiresAt.toISOString(),
    },
  })

  const cookie = serializeCookie(
    OAUTH_COOKIE,
    signedToken({ v: 1, rowId, provider: normalized, state, nonce, verifier, exp: expiresAt.getTime() }, secret()),
    { secure: secureCookie(), sameSite: 'Lax', maxAge: Math.floor(OAUTH_TTL_MS / 1000) },
  )
  const url = new URL(`${supabaseBaseUrl()}/auth/v1/authorize`)
  url.searchParams.set('provider', normalized)
  url.searchParams.set('redirect_to', redirectUri)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 's256')
  url.searchParams.set('state', state)
  url.searchParams.set('nonce', nonce)
  return { authorizationUrl: url.toString(), cookie }
}

async function consumeState(rowId) {
  await serviceRest(`/rest/v1/oauth_login_states?id=eq.${encodeURIComponent(rowId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { consumed_at: new Date().toISOString() },
  })
}

export async function completeOAuth(request) {
  const url = new URL(request.url)
  if (url.searchParams.get('error')) throw new HttpError(400, 'OAuth authorization was cancelled.', 'oauth-cancelled')
  const code = String(url.searchParams.get('code') || '')
  const returnedState = String(url.searchParams.get('state') || '')
  if (!code || !returnedState) throw new HttpError(400, 'OAuth callback is incomplete.', 'oauth-invalid')

  const cookieToken = parseCookies(request)[OAUTH_COOKIE]
  const payload = verifySignedToken(cookieToken, secret())
  if (
    payload?.v !== 1 ||
    !payload.rowId ||
    payload.state !== returnedState ||
    Number(payload.exp || 0) <= Date.now() ||
    !allowedProviders().has(payload.provider)
  ) {
    throw new HttpError(400, 'OAuth verification failed.', 'oauth-invalid')
  }

  const { data } = await serviceRest(
    `/rest/v1/oauth_login_states?id=eq.${encodeURIComponent(payload.rowId)}&provider=eq.${encodeURIComponent(payload.provider)}&select=*&limit=1`,
  )
  const row = Array.isArray(data) ? data[0] || null : null
  if (
    !row ||
    row.consumed_at ||
    new Date(row.expires_at).getTime() <= Date.now() ||
    row.state_hash !== sha256(payload.state) ||
    row.nonce_hash !== sha256(payload.nonce) ||
    row.pkce_verifier_hash !== sha256(payload.verifier)
  ) {
    throw new HttpError(400, 'OAuth verification failed.', 'oauth-invalid')
  }

  let tokenResponse
  try {
    const result = await authPublic('/auth/v1/token?grant_type=pkce', {
      method: 'POST',
      body: { auth_code: code, code_verifier: payload.verifier },
      exposeError: false,
      errorMessage: 'OAuth code exchange failed.',
    })
    tokenResponse = result.data
  } finally {
    await consumeState(payload.rowId).catch(() => undefined)
  }

  if (!tokenResponse.user?.id || !(await loadProfile(tokenResponse.user.id))) {
    await authPublic('/auth/v1/logout?scope=global', {
      method: 'POST',
      token: tokenResponse.access_token,
      exposeError: false,
    }).catch(() => undefined)
    throw new HttpError(403, 'This social identity is not linked to a WRS profile.', 'oauth-profile-required')
  }
  await recordSessionMetadata(tokenResponse.user.id, tokenResponse.access_token, true)
  const session = await buildAppSession(tokenResponse.user, tokenResponse.access_token)
  if (!session) throw new HttpError(401, 'Unable to establish a revocable WRS session.', 'invalid-session')
  await recordSecurityEvent(session.userId, 'oauth.login.succeeded', { provider: payload.provider })
  return { session, cookies: [...sessionCookies(tokenResponse, true), clearOAuthCookie()] }
}
