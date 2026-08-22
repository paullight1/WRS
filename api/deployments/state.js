import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { ownedDeployment, transitionDeployment } from '../../server/deployment.js'
import { requireSession } from '../../server/session.js'

const ownerStates = new Set(['active', 'paused', 'cancelled'])

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 16_000)
  const deploymentId = String(body.deploymentId || '').trim()
  const state = String(body.state || '')
    .trim()
    .toLowerCase()
  const reason = String(body.reason || '')
    .trim()
    .slice(0, 500)
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!deploymentId) throw new HttpError(400, 'Deployment ID is required.', 'deployment-required')
  if (!ownerStates.has(state)) {
    throw new HttpError(403, 'Owners cannot mark deployments completed or failed.', 'state-not-owner-controlled')
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }

  await transitionDeployment(resolved.user.id, deploymentId, state, reason, idempotencyKey)
  const deployment = await ownedDeployment(resolved.user.id, deploymentId)
  return appendCookies(json({ deployment }), resolved.cookies)
})
