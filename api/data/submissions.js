import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { submitDataAsset } from '../../server/data.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 48_000)
  const assetId = String(body.assetId || '').trim()
  if (!assetId) throw new HttpError(400, 'Asset ID is required.', 'asset-required')
  // Quality/approval are server-owned. body.qualityScore and body.approved are intentionally ignored.
  const result = await submitDataAsset(
    resolved.user.id,
    assetId,
    typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
  )
  return appendCookies(json({ ...result, status: 'submitted' }, 201), resolved.cookies)
})
