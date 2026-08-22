import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { installMarketplaceItem } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const entitlementId = String(body.entitlementId || '').trim()
  if (!entitlementId) throw new HttpError(400, 'Marketplace entitlement is required.', 'entitlement-required')
  const result = await installMarketplaceItem(resolved.user.id, entitlementId)
  return appendCookies(json(result), resolved.cookies)
})
