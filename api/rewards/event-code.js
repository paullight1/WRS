import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { redeemEventCode } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const code = String(body.code || '').trim().toUpperCase()
  if (!/^[A-Z0-9-]{8,64}$/.test(code)) throw new HttpError(400, 'Enter a valid event code.', 'invalid-code')
  const result = await redeemEventCode(resolved.user.id, code)
  return appendCookies(json(result), resolved.cookies)
})
