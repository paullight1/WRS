import { appendCookies, assertSameOrigin, functionHandler, json, requireMethod } from '../_lib/http.js'
import { enforceRateLimit } from '../_lib/auth.js'
import { requireSession } from '../_lib/session.js'
import { serviceRpc } from '../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  await enforceRateLimit(request, 'reward-daily-activity', resolved.user.id, 30, 3600)
  const { data } = await serviceRpc('wrs_award_member_milestones', { p_user_id: resolved.user.id })
  return appendCookies(json(data), resolved.cookies)
})
