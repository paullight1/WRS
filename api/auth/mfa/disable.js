import { disableMfa } from '../../_lib/mfa.js'
import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../../_lib/http.js'
import { requireSession } from '../../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request)
  const result = await disableMfa(resolved, String(body.code || ''))
  return appendCookies(json({ session: result.session }), result.cookies)
})
