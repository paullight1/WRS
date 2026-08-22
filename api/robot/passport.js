import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../_lib/http.js'
import { requireSession } from '../_lib/session.js'
import { serviceRpc } from '../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const robotId = String(new URL(request.url).searchParams.get('robotId') || '')
  if (!robotId) throw new HttpError(400, 'Robot ID is required.', 'invalid-robot')
  const { data: passport } = await serviceRpc('wrs_get_robot_passport', {
    p_user_id: resolved.user.id,
    p_robot_id: robotId,
  })
  if (!passport) throw new HttpError(404, 'Robot passport was not found.', 'passport-not-found')
  return appendCookies(json({ passport }), resolved.cookies)
})
