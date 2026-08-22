import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { activateRewardBoost } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const boostSlug = String(body.boostSlug || '').trim()
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!boostSlug) throw new HttpError(400, 'Boost is required.', 'boost-required')
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }
  const result = await activateRewardBoost(resolved.user.id, boostSlug, idempotencyKey)
  return appendCookies(json(result, 201), resolved.cookies)
})
