import { enforceRateLimit } from '../../auth.js'
import { redeemEventCode } from '../../../api/_lib/ecosystem.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../http.js'
import { requireSession } from '../../session.js'

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
