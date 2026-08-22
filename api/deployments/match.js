import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'
import { matchDeploymentRequest } from '../../server/deployment.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_DEPLOYMENT_OPERATIONS_SECRET', 'Deployment operations are not configured.')
  const body = await readJson(request, 32_000)
  const requestId = String(body.requestId || '').trim()
  if (!requestId) throw new HttpError(400, 'Deployment request ID is required.', 'request-required')
  const termsOverride = typeof body.termsOverride === 'object' && body.termsOverride ? body.termsOverride : {}
  const contractId = await matchDeploymentRequest(requestId, termsOverride)
  return json({ contractId, status: 'offered' }, 201)
})
