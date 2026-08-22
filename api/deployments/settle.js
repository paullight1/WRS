import { settleDeployment } from '../../server/deployment.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_DEPLOYMENT_SETTLEMENT_SECRET', 'Deployment settlement is not configured.')
  const body = await readJson(request, 8_000)
  const deploymentId = String(body.deploymentId || '').trim()
  if (!deploymentId) throw new HttpError(400, 'Deployment ID is required.', 'deployment-required')
  const settlement = await settleDeployment(deploymentId)
  return json({ settlement })
})
