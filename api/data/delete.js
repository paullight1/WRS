import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../../server/http.js'
import { completeDeletion, ownedAsset, ownedAssets, requestDeletion } from '../../server/data.js'
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
  const assets = assetId
    ? [await ownedAsset(resolved.user.id, assetId)].filter(Boolean)
    : await ownedAssets(resolved.user.id)

  try {
    for (const asset of assets) await deletePrivateObject(asset.storage_bucket, asset.storage_path)
    await completeDeletion(requestRecord.requestId, true, {
      deletedObjects: assets.length,
      scope: assetId ? 'asset' : 'all-owned-assets',
    })
    return appendCookies(
      json({ requestId: requestRecord.requestId, status: 'completed', deletedObjects: assets.length }),
      resolved.cookies,
    )
  } catch (error) {
    await completeDeletion(requestRecord.requestId, false, {
      attemptedObjects: assets.length,
      error: error instanceof Error ? error.message.slice(0, 300) : 'storage-deletion-failed',
    }).catch(() => undefined)
    throw error
  }
})
