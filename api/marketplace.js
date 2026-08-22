import { appendCookies, functionHandler, json, requireMethod } from './server/http.js'
import { marketplaceCatalog } from './server/ecosystem.js'
import { requireSession } from './server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const items = await marketplaceCatalog(resolved.user.id)
  return appendCookies(json({ items }), resolved.cookies)
})
