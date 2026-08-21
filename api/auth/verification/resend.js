import { enforceRateLimit, resendVerification } from '../../_lib/auth.js'
import { verifySignedToken } from '../../_lib/crypto.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../_lib/http.js'

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
  if (payload?.userId !== userId || payload?.kind !== kind || Number(payload?.exp || 0) <= Date.now()) {
    throw new HttpError(403, 'Verification context is invalid.', 'invalid-challenge')
  }
  await enforceRateLimit(request, `resend:${kind}`, userId, 4, 15 * 60)
  return json({ challenge: await resendVerification(userId, kind) })
})
