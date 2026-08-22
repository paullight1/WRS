import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { recordDeploymentWork } from '../../server/deployment.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 32_000)
  const deploymentId = String(body.deploymentId || '').trim()
  const taskReference = String(body.taskReference || '').trim().slice(0, 200)
  const durationMinutes = Number(body.durationMinutes || 0)
  const units = Number(body.units || 0)
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!deploymentId || !taskReference) throw new HttpError(400, 'Deployment work reference is required.', 'work-required')
  if (!Number.isInteger(durationMinutes) || durationMinutes < 0 || durationMinutes > 1440) {
    throw new HttpError(400, 'Invalid work duration.', 'invalid-duration')
  }
  if (!Number.isFinite(units) || units < 0 || (durationMinutes === 0 && units === 0)) {
    throw new HttpError(400, 'Work evidence must include duration or units.', 'invalid-units')
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }
  const workLogId = await recordDeploymentWork(resolved.user.id, deploymentId, {
    taskReference,
    durationMinutes,
    units,
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    idempotencyKey,
  })
  return appendCookies(json({ workLogId, verificationStatus: 'pending' }, 201), resolved.cookies)
})
