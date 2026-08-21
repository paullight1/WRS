import { enforceRateLimit, resendVerification } from '../../_lib/auth.js'
import { sha256, verifySignedToken } from '../../_lib/crypto.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../_lib/http.js'
import { serviceRest } from '../../_lib/supabase.js'

function verificationSecret() {
  const secret = process.env.WRS_AUTH_CHALLENGE_SECRET || process.env.WRS_SERVER_SIGNING_SECRET
  if (!secret) throw new HttpError(503, 'Verification signing is not configured.', 'verification-unavailable')
  return secret
}

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const userId = String(body.userId || '')
  const kind = String(body.kind || '')
  const challengeId = String(body.challengeId || '')
  const payload = verifySignedToken(challengeId, verificationSecret())
  if (
    payload?.userId !== userId ||
    payload?.kind !== kind ||
    !payload?.id ||
    !payload?.ref ||
    Number(payload?.exp || 0) <= Date.now()
  ) {
    throw new HttpError(403, 'Verification context is invalid.', 'invalid-challenge')
  }

  const { data } = await serviceRest(
    `/rest/v1/verification_requests?id=eq.${encodeURIComponent(payload.id)}&user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&consumed_at=is.null&superseded_at=is.null&select=id,secret_hash,resend_available_at&limit=1`,
  )
  const row = Array.isArray(data) ? data[0] || null : null
  if (!row || row.secret_hash !== sha256(payload.ref)) {
    throw new HttpError(403, 'Verification context is no longer active.', 'invalid-challenge')
  }
  if (new Date(row.resend_available_at).getTime() > Date.now()) {
    throw new HttpError(429, 'Please wait before requesting another code.', 'resend-cooldown')
  }

  await enforceRateLimit(request, `resend:${kind}`, userId, 4, 15 * 60)
  return json({ challenge: await resendVerification(userId, kind) })
})
