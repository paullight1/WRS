import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { acceptReferral } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const code = String(body.code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{8,24}$/.test(code)) throw new HttpError(400, 'Enter a valid referral code.', 'invalid-code')
  const result = await acceptReferral(resolved.user.id, code)
  return appendCookies(json(result, 201), resolved.cookies)
})
