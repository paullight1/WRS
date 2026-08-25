import { enforceRateLimit } from '../../server/auth.js'
import { redeemEventCode } from '../../server/ecosystem.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  await enforceRateLimit(request, 'event-code-redeem', resolved.user.id, 10, 600)
  const body = await readJson(request, 12_000)
  const code = String(body.code || '')
    .trim()
    .toUpperCase()
  if (!/^[A-Z0-9-]{8,64}$/.test(code)) throw new HttpError(400, 'Enter a valid event code.', 'invalid-code')
  const result = await redeemEventCode(resolved.user.id, code)
  return appendCookies(json(result), resolved.cookies)
})
