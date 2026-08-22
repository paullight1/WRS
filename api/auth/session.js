import { appendCookies, functionHandler, json, requireMethod } from '../_lib/http.js'
import { resolveSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await resolveSession(request)
  return appendCookies(json({ session: resolved.session }), resolved.cookies)
})
