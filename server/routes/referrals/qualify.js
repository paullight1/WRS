import { qualifyReferral } from '../../../api/_lib/ecosystem.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../http.js'
import { requireInternalBearer } from '../../internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_REFERRAL_QUALIFIER_TOKEN')
  const body = await readJson(request, 12_000)
  const relationshipId = String(body.relationshipId || '').trim()
  if (!relationshipId) throw new HttpError(400, 'Referral relationship is required.', 'relationship-required')
  const result = await qualifyReferral(relationshipId)
  return json(result)
})
