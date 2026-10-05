import { appendCookies, functionHandler, json, requireMethod } from './_lib/http.js'
import { rewardSnapshot } from './_lib/ecosystem.js'
import { requireSession } from './_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  return appendCookies(json(await rewardSnapshot(resolved.user.id)), resolved.cookies)
})
