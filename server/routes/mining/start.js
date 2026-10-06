import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../../../api/_lib/http.js'
import { startMiningSession, validateMiningStartBody } from '../../../api/_lib/mining.js'
import { requireSession } from '../../../api/_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const start = validateMiningStartBody(await readJson(request, 4_000))
  return appendCookies(json(await startMiningSession(resolved.user.id, start)), resolved.cookies)
})
