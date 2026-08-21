import { enforceRateLimit, loadProfile, verifyChallenge } from '../../server/auth.js'
import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import {
  buildAppSession,
  recordSessionMetadata,
  revokeAllUserSessionMetadata,
  sessionCookies,
} from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const userId = String(body.userId || '')
  const challengeId = String(body.challengeId || '')
  const kind = String(body.kind || '')
  const code = String(body.code || '')
  await enforceRateLimit(request, `verify:${kind}`, userId, 10, 10 * 60)
  const tokenResponse = await verifyChallenge(userId, kind, challengeId, code)
  const profile = await loadProfile(userId)
  if (profile?.email_verified_at && profile?.phone_verified_at) {
    await revokeAllUserSessionMetadata(userId)
  }
  await recordSessionMetadata(userId, tokenResponse.access_token, false)
  const session = await buildAppSession(tokenResponse.user, tokenResponse.access_token)
  if (!session) throw new HttpError(401, 'Unable to establish a revocable WRS session.', 'invalid-session')
  return appendCookies(json({ session }), sessionCookies(tokenResponse, false))
})
