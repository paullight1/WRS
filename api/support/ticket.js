import { addSupportMessage, createSupportTicket } from '../_lib/account.js'
import { enforceRateLimit } from '../_lib/auth.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../_lib/http.js'
import { requireSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  await enforceRateLimit(request, 'support-mutation', resolved.user.id, 20, 600)
  const body = await readJson(request, 24_000)
  const action = String(body.action || '').trim()
  if (action === 'create') {
    const input = {
      category: String(body.category || '').trim(),
      subject: String(body.subject || '').trim(),
      message: String(body.message || '').trim(),
    }
    const result = await createSupportTicket(resolved.user.id, input)
    return appendCookies(json(result, 201), resolved.cookies)
  }
  if (action === 'message') {
    const ticketId = String(body.ticketId || '').trim()
    const message = String(body.message || '').trim()
    if (!ticketId || !message) throw new HttpError(400, 'Ticket and message are required.', 'message-required')
    const result = await addSupportMessage(resolved.user.id, ticketId, message)
    return appendCookies(json(result, 201), resolved.cookies)
  }
  throw new HttpError(400, 'Unsupported support action.', 'invalid-action')
})
