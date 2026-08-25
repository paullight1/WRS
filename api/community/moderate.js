import { moderateCommunity } from '../../server/ecosystem.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_COMMUNITY_MODERATOR_TOKEN')
  const body = await readJson(request, 24_000)
  const targetType = String(body.targetType || '').trim()
  const targetId = String(body.targetId || '').trim()
  const action = String(body.action || '').trim()
  const reason = String(body.reason || '').trim()
  const operatorReference = String(body.operatorReference || '').trim()
  const metadata = typeof body.metadata === 'object' && body.metadata ? body.metadata : {}
  if (!targetType || !targetId || !action || !reason || !operatorReference) {
    throw new HttpError(400, 'Complete moderation evidence is required.', 'moderation-required')
  }
  const result = await moderateCommunity(targetType, targetId, action, reason, operatorReference, metadata)
  return json(result, 201)
})
