import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../_lib/http.js'
import { startMiningSession, validateMiningStartBody } from '../_lib/mining.js'
import { requireSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const start = validateMiningStartBody(await readJson(request, 4_000))
  return appendCookies(json(await startMiningSession(resolved.user.id, start)), resolved.cookies)
})
