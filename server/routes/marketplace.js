import { appendCookies, functionHandler, json, requireMethod } from '../http.js'
import { marketplaceCatalog } from '../../api/_lib/ecosystem.js'
import { requireSession } from '../session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const items = await marketplaceCatalog(resolved.user.id)
  return appendCookies(json({ items }), resolved.cookies)
})
