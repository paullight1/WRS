import { appendCookies, functionHandler, json, requireMethod } from '../../api/_lib/http.js'
import { miningSnapshot } from '../../api/_lib/mining.js'
import { requireSession } from '../../api/_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  return appendCookies(json(await miningSnapshot(resolved.user.id)), resolved.cookies)
})
