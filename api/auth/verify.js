import { enforceRateLimit, verifyChallenge } from '../_lib/auth.js'
import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../_lib/http.js'
import { buildAppSession, recordSessionMetadata, sessionCookies } from '../_lib/session.js'

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
  const session = await buildAppSession(tokenResponse.user, tokenResponse.access_token)
  await recordSessionMetadata(userId, tokenResponse.access_token, false)
  return appendCookies(json({ session }), sessionCookies(tokenResponse, false))
})
