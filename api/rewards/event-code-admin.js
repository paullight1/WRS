import crypto from 'node:crypto'
import { createEventRewardCode } from '../../server/ecosystem.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_ECOSYSTEM_OPERATOR_TOKEN')
  const body = await readJson(request, 16_000)
  const eventId = String(body.eventId || '').trim()
  const rewardPoints = Number(body.rewardPoints)
  const maxRedemptions = Number(body.maxRedemptions || 1)
  const expiresAt = new Date(String(body.expiresAt || ''))
  if (!eventId) throw new HttpError(400, 'Reward event is required.', 'event-required')
  if (!Number.isSafeInteger(rewardPoints) || rewardPoints <= 0 || rewardPoints > 100000) {
    throw new HttpError(400, 'Invalid reward point policy.', 'invalid-points')
  }
  if (!Number.isSafeInteger(maxRedemptions) || maxRedemptions <= 0 || maxRedemptions > 100000) {
    throw new HttpError(400, 'Invalid redemption limit.', 'invalid-redemptions')
  }
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new HttpError(400, 'A future expiry is required.', 'invalid-expiry')
  }
  const code = `WRS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
  const result = await createEventRewardCode(eventId, code, rewardPoints, expiresAt.toISOString(), maxRedemptions)
  return json(result, 201)
})
