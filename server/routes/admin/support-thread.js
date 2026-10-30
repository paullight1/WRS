import { requireAdminSession } from '../../../api/_lib/account.js'
import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../../../api/_lib/http.js'
import { serviceRest } from '../../../api/_lib/supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_SIZE = 50
export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireAdminSession(request, 'operations.support')
  const params = new URL(request.url).searchParams
  const ticketId = params.get('ticketId') || ''
  const beforeId = params.get('beforeId') || ''
  const beforeTime = params.get('beforeTime') || ''
  if (!UUID.test(ticketId)) throw new HttpError(400, 'Choose a valid support ticket.', 'invalid-ticket')
  if (
    (beforeId || beforeTime) &&
    (!UUID.test(beforeId) ||
      !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(beforeTime) ||
      !Number.isFinite(new Date(beforeTime).getTime()))
  )
    throw new HttpError(400, 'The message page is invalid. Reopen this ticket.', 'invalid-cursor')
  const ticket = await serviceRest(`/rest/v1/support_tickets?id=eq.${ticketId}&select=id&limit=1`)
  if (!Array.isArray(ticket.data) || !ticket.data.length)
    throw new HttpError(404, 'This ticket is unavailable.', 'ticket-not-found')
  const query = new URLSearchParams({
    ticket_id: `eq.${ticketId}`,
    select: 'id,author_user_id,author_role,body,created_at',
    order: 'created_at.desc,id.desc',
    limit: String(PAGE_SIZE + 1),
  })
  if (beforeId) query.set('or', `(created_at.lt.${beforeTime},and(created_at.eq.${beforeTime},id.lt.${beforeId}))`)
  const result = await serviceRest(`/rest/v1/support_messages?${query}`)
  if (!Array.isArray(result.data)) throw new HttpError(502, 'Messages could not be loaded.', 'messages-unavailable')
  const page = result.data.slice(0, PAGE_SIZE)
  const authors = [...new Set(page.map((message) => message.author_user_id).filter(Boolean))]
  let profiles = new Map()
  let namesUnavailable = false
  if (authors.length) {
    try {
      const result = await serviceRest(
        `/rest/v1/user_profiles?user_id=in.(${authors.map(encodeURIComponent).join(',')})&select=user_id,full_name&limit=${authors.length}`,
      )
      if (!Array.isArray(result.data)) throw new Error('Names unavailable')
      profiles = new Map(result.data.map((profile) => [profile.user_id, profile.full_name]))
    } catch {
      namesUnavailable = true
    }
  }
  const oldest = page.at(-1)
  return appendCookies(
    json({
      messages: page
        .reverse()
        .map((message) => ({ ...message, author_name: profiles.get(message.author_user_id) || null })),
      hasMore: result.data.length > PAGE_SIZE,
      before: oldest ? { id: oldest.id, time: oldest.created_at } : null,
      namesUnavailable,
    }),
    resolved.cookies,
  )
})
