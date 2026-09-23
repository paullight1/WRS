import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../http.js'
import { joinCommunityEvent } from '../../../api/_lib/ecosystem.js'
import { requireSession } from '../../session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const eventId = String(body.eventId || '').trim()
  if (!eventId) throw new HttpError(400, 'Community event is required.', 'event-required')
  const result = await joinCommunityEvent(resolved.user.id, eventId, Boolean(body.reminderEnabled))
  return appendCookies(json(result, 201), resolved.cookies)
})
