import { appendCookies, functionHandler, json, requireMethod } from '../../../api/_lib/http.js'
import { miningDailyProgress } from '../../../api/_lib/miningProgress.js'
import { requireSession } from '../../../api/_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  return appendCookies(json(await miningDailyProgress(resolved.user.id)), resolved.cookies)
})
