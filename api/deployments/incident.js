import { reportDeploymentIncident } from '../../server/deployment.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const deploymentId = String(body.deploymentId || '').trim()
  const severity = String(body.severity || '')
    .trim()
    .toLowerCase()
  const summary = String(body.summary || '')
    .trim()
    .slice(0, 1000)
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!deploymentId || !['low', 'medium', 'high', 'critical'].includes(severity) || !summary) {
    throw new HttpError(400, 'Deployment, severity and incident summary are required.', 'incident-required')
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }
  const incidentId = await reportDeploymentIncident(
    resolved.user.id,
    deploymentId,
    severity,
    summary,
    idempotencyKey,
    typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
  )
  return appendCookies(json({ incidentId, status: 'recorded' }, 201), resolved.cookies)
})
