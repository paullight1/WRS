import { appendCookies, functionHandler, json, requireMethod } from '../server/http.js'
import { communitySnapshot } from '../server/ecosystem.js'
import { requireSession } from '../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const snapshot = await communitySnapshot(resolved.user.id)
  return appendCookies(json(snapshot), resolved.cookies)
})
