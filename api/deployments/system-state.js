import { deploymentById, ownedDeployment, transitionDeployment } from '../../server/deployment.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

const internalStates = new Set(['active', 'paused', 'completed', 'cancelled', 'failed'])

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_DEPLOYMENT_OPERATIONS_SECRET', 'Deployment operations are not configured.')
  const body = await readJson(request, 16_000)
  const deploymentId = String(body.deploymentId || '').trim()
  const state = String(body.state || '').trim().toLowerCase()
  const reason = String(body.reason || '').trim().slice(0, 500)
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!deploymentId || !internalStates.has(state)) {
    throw new HttpError(400, 'Valid deployment and state are required.', 'state-required')
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }
  const current = await deploymentById(deploymentId)
  if (!current?.userId) throw new HttpError(404, 'Deployment not found.', 'deployment-not-found')
  await transitionDeployment(current.userId, deploymentId, state, reason, idempotencyKey)
  const deployment = await ownedDeployment(current.userId, deploymentId)
  return json({ deployment })
})
