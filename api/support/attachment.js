import crypto from 'node:crypto'
import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../_lib/http.js'
import { requireSession } from '../_lib/session.js'
import { createSignedUploadGrant } from '../_lib/storage.js'
import { serviceRest } from '../_lib/supabase.js'

const allowedMime = new Set(['application/pdf', 'text/plain', 'image/jpeg', 'image/png'])

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 16_000)
  const ticketId = String(body.ticketId || '').trim()
  const fileName = String(body.fileName || '').trim().slice(0, 180)
  const mimeType = String(body.mimeType || '').trim().toLowerCase()
  const sizeBytes = Number(body.sizeBytes)
  if (!ticketId || !fileName) throw new HttpError(400, 'Ticket and file name are required.', 'attachment-required')
  if (!allowedMime.has(mimeType)) throw new HttpError(415, 'Support attachment type is not allowed.', 'invalid-mime')
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 10_485_760) {
    throw new HttpError(413, 'Support attachment must be 10 MB or smaller.', 'invalid-size')
  }
  const { data: tickets } = await serviceRest(
    `/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticketId)}&user_id=eq.${encodeURIComponent(resolved.user.id)}&select=id&limit=1`,
  )
  if (!Array.isArray(tickets) || !tickets.length) throw new HttpError(404, 'Support ticket not found.', 'ticket-not-found')
  const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'text/plain' ? 'txt' : mimeType === 'image/png' ? 'png' : 'jpg'
  const objectKey = `${resolved.user.id}/support/${ticketId}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const grant = await createSignedUploadGrant(objectKey)
  const { data } = await serviceRest('/rest/v1/support_attachments', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      ticket_id: ticketId,
      user_id: resolved.user.id,
      storage_bucket: grant.bucket,
      storage_path: grant.path,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      scan_status: 'pending',
    },
  })
  const attachment = Array.isArray(data) ? data[0] : data
  return appendCookies(json({ attachmentId: attachment?.id, signedUrl: grant.signedUrl, token: grant.token, path: grant.path, expiresInSeconds: grant.expiresInSeconds }, 201), resolved.cookies)
})
