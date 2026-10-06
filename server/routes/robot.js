import { appendCookies, functionHandler, json, requireMethod } from '../../api/_lib/http.js'
import { loadRobotState } from '../../api/_lib/robot.js'
import { requireSession } from '../../api/_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const state = await loadRobotState(resolved.user.id)
  return appendCookies(json(state), resolved.cookies)
})
