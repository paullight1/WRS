import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { acquireMarketplaceItem } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 16_000)
  const versionId = String(body.versionId || '').trim()
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!versionId) throw new HttpError(400, 'Marketplace version is required.', 'version-required')
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }
  const result = await acquireMarketplaceItem(resolved.user.id, versionId, idempotencyKey)
  return appendCookies(json(result, 201), resolved.cookies)
})
