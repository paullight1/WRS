import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { markDataAssetUploaded, ownedAsset } from '../../server/data.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 16_000)
  const assetId = String(body.assetId || '').trim()
  if (!assetId) throw new HttpError(400, 'Asset ID is required.', 'asset-required')
  const asset = await ownedAsset(resolved.user.id, assetId)
  if (!asset) throw new HttpError(404, 'Data asset not found.', 'asset-not-found')
  const checksum = body.checksumSha256 ? String(body.checksumSha256).toLowerCase() : null
  if (checksum && !/^[a-f0-9]{64}$/.test(checksum)) throw new HttpError(400, 'Invalid SHA-256 checksum.', 'invalid-checksum')
  // Upload completion never marks content clean; a trusted scanner must finalize scan_status separately.
  await markDataAssetUploaded(assetId, checksum, 'pending')
  return appendCookies(json({ assetId, status: 'uploaded', scanStatus: 'pending' }), resolved.cookies)
})
