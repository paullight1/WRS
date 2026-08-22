import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../../server/http.js'
import { requestDeletion } from '../../server/data.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const assetId = body.assetId ? String(body.assetId).trim() : null
  const reason = body.reason ? String(body.reason).slice(0, 500) : null
  const requestRecord = await requestDeletion(resolved.user.id, assetId, reason)

  // Signed upload grants can remain valid for up to two hours. Deletion is
  // therefore queued and finalized by the internal deletion worker only after
  // that grace window. This avoids claiming deletion while a late upload can
  // still recreate a private object.
  return appendCookies(
    json(
      {
        requestId: requestRecord.requestId,
        status: 'requested',
        scope: assetId ? 'asset' : 'all-owned-assets',
        earliestFinalizationSeconds: 7200,
        message: 'Deletion is queued. WRS will only mark it complete after private storage is swept successfully.',
      },
      202,
    ),
    resolved.cookies,
  )
})
