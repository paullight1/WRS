import { verifyCommunityAttendance } from '../../server/ecosystem.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_COMMUNITY_OPERATOR_TOKEN')
  const body = await readJson(request, 16_000)
  const eventId = String(body.eventId || '').trim()
  const userId = String(body.userId || '').trim()
  const attendanceReference = String(body.attendanceReference || '').trim()
  if (!eventId || !userId || !attendanceReference) {
    throw new HttpError(400, 'Event, user and attendance reference are required.', 'attendance-required')
  }
  const result = await verifyCommunityAttendance(eventId, userId, attendanceReference)
  return json(result)
})
