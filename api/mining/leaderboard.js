import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../_lib/http.js'
import { miningLeaderboard } from '../_lib/mining.js'
import { requireSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const period = new URL(request.url).searchParams.get('period') || 'week'
  if (period !== 'week' && period !== 'all-time') {
    throw new HttpError(400, 'Choose a supported leaderboard period.', 'leaderboard-period-invalid')
  }
  return appendCookies(json(await miningLeaderboard(period)), resolved.cookies)
})
