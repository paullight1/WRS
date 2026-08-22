import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { completeDeletion, ownedAsset, requestDeletion } from '../../server/data.js'
import { requireSession } from '../../server/session.js'
import { deletePrivateObject } from '../../server/storage.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const assetId = body.assetId ? String(body.assetId).trim() : null
  const reason = body.reason ? String(body.reason).slice(0, 500) : null

  const requestRecord = await requestDeletion(resolved.user.id, assetId, reason)
  const assets = []
  if (assetId) {
    const asset = await ownedAsset(resolved.user.id, assetId)
    if (asset) assets.push(asset)
  } else {
    // Whole-account sensitive-data deletion is intentionally completed by the
    // asynchronous deletion worker in Plan 9; this endpoint records the request.
    await completeDeletion(requestRecord.requestId, false, { requiresBulkWorker: true })
    return appendCookies(json({ requestId: requestRecord.requestId, status: 'failed', requiresBulkWorker: true }, 202), resolved.cookies)
  }

  try {
    for (const asset of assets) await deletePrivateObject(asset.storage_bucket, asset.storage_path)
    await completeDeletion(requestRecord.requestId, true, { deletedObjects: assets.length })
    return appendCookies(json({ requestId: requestRecord.requestId, status: 'completed' }), resolved.cookies)
  } catch (error) {
    await completeDeletion(requestRecord.requestId, false, {
      error: error instanceof Error ? error.message.slice(0, 300) : 'storage-deletion-failed',
    }).catch(() => undefined)
    throw error
  }
})
