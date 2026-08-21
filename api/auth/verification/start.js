import { enforceRateLimit, issueMissingVerificationChallenges } from '../../_lib/auth.js'
import { assertSameOrigin, functionHandler, json, requireMethod } from '../../_lib/http.js'
import { requireSession } from '../../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request)
  await enforceRateLimit(request, 'verification-start', resolved.user.id, 4, 15 * 60)
  return json({ userId: resolved.user.id, challenges: await issueMissingVerificationChallenges(resolved.user) })
})
