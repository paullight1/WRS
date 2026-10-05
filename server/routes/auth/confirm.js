import { authPublic, serviceRest } from '../../../api/_lib/supabase.js'
import { sha256 } from '../../../api/_lib/crypto.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../../api/_lib/http.js'
import { buildAppSession, recordSessionMetadata, sessionCookies } from '../../../api/_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const accessToken = String(body.accessToken || '')
  const refreshToken = String(body.refreshToken || '')
  if (!accessToken || !refreshToken) {
    throw new HttpError(400, 'Confirmation session is incomplete.', 'invalid-confirmation')
  }
  const { data: user } = await authPublic('/auth/v1/user', {
    token: accessToken,
    exposeError: false,
    errorMessage: 'Confirmation session is invalid or expired.',
  })
  if (!user?.id) throw new HttpError(401, 'Confirmation session is invalid or expired.', 'invalid-confirmation')
  const now = new Date().toISOString()
  const { data: profiles } = await serviceRest(
    `/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`,
  )
  if (!Array.isArray(profiles) || !profiles.length) {
    const digits = sha256(String(user.id)).replace(/\D/g, '').slice(0, 12).padEnd(12, '7')
    await serviceRest('/rest/v1/user_profiles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        user_id: user.id,
        full_name: String(user.user_metadata?.full_name || user.email?.split('@')[0] || 'WRS builder'),
        normalized_email: String(user.email || '')
          .trim()
          .toLowerCase(),
        normalized_phone: `+999${digits}`,
        status: 'pending',
        terms_version: String(user.user_metadata?.terms_version || '2026-08-21'),
        privacy_version: String(user.user_metadata?.privacy_version || '2026-08-21'),
        legal_accepted_at: now,
      },
    })
  }
  await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(user.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { email_verified_at: now, status: 'active', updated_at: now },
  })
  await recordSessionMetadata(user.id, accessToken, true)
  const session = await buildAppSession(user, accessToken)
  if (!session) throw new HttpError(401, 'Unable to establish your WRS session.', 'invalid-session')
  return appendCookies(
    json({ session }),
    sessionCookies({ access_token: accessToken, refresh_token: refreshToken, expires_in: 3600 }, true),
  )
})
