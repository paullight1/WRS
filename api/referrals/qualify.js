import { qualifyReferral } from '../../server/ecosystem.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_REFERRAL_QUALIFIER_TOKEN')
  const body = await readJson(request, 12_000)
  const relationshipId = String(body.relationshipId || '').trim()
  if (!relationshipId) throw new HttpError(400, 'Referral relationship is required.', 'relationship-required')
  const result = await qualifyReferral(relationshipId)
  return json(result)
})
