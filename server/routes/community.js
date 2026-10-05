import { appendCookies, functionHandler, json, requireMethod } from '../http.js'
import { communitySnapshot } from '../../api/_lib/ecosystem.js'
import { requireSession } from '../session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const snapshot = await communitySnapshot(resolved.user.id)
  return appendCookies(json(snapshot), resolved.cookies)
})
