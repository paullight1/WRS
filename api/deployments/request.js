import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requestDeployment } from '../../server/deployment.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 16_000)
  const opportunityId = String(body.opportunityId || '').trim()
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!opportunityId) throw new HttpError(400, 'Opportunity ID is required.', 'opportunity-required')
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }

  const result = await requestDeployment(resolved.user.id, opportunityId, idempotencyKey)
  const status = result?.status === 'ineligible' || result?.status === 'full' ? 409 : 201
  return appendCookies(json(result, status), resolved.cookies)
})
