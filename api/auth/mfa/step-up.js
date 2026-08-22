import { verifyMfa } from '../../../server/mfa.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { serviceRest } from '../../../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true, allowDeletionPending: true })
  const body = await readJson(request, 8_000)
  const code = String(body.code || '').trim()
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'Enter a six-digit authenticator code.', 'invalid-factor')
  const { data } = await serviceRest(
    `/rest/v1/user_mfa_factors?user_id=eq.${encodeURIComponent(resolved.user.id)}&status=eq.verified&select=provider_factor_id&order=verified_at.desc&limit=1`,
  )
  const factor = Array.isArray(data) ? data[0] || null : null
  if (!factor?.provider_factor_id) {
    throw new HttpError(409, 'A verified authenticator is required for step-up.', 'mfa-not-enabled')
  }
  const result = await verifyMfa(resolved, factor.provider_factor_id, code)
  return appendCookies(json({ session: result.session }), result.cookies)
})
