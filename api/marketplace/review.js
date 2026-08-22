import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { reviewMarketplaceItem } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const itemId = String(body.itemId || '').trim()
  const rating = Number(body.rating)
  const reviewText = String(body.reviewText || '').trim()
  if (!itemId) throw new HttpError(400, 'Marketplace item is required.', 'item-required')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be between 1 and 5.', 'invalid-rating')
  }
  const result = await reviewMarketplaceItem(resolved.user.id, itemId, rating, reviewText)
  return appendCookies(json(result), resolved.cookies)
})
