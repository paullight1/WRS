import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'
import { verifyDeploymentWork } from '../../server/deployment.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_DEPLOYMENT_VERIFIER_SECRET', 'Deployment verifier is not configured.')
  const body = await readJson(request, 32_000)
  const workLogId = String(body.workLogId || '').trim()
  const status = String(body.status || '')
    .trim()
    .toLowerCase()
  const qualityScore = Number(body.qualityScore)
  const verifierReference = String(body.verifierReference || '')
    .trim()
    .slice(0, 200)
  if (!workLogId || !['verified', 'rejected'].includes(status)) {
    throw new HttpError(400, 'Valid work log and verification status are required.', 'verification-required')
  }
  if (!Number.isFinite(qualityScore) || qualityScore < 0 || qualityScore > 100) {
    throw new HttpError(400, 'Quality score must be between 0 and 100.', 'invalid-quality')
  }
  if (!verifierReference) throw new HttpError(400, 'Verifier reference is required.', 'verifier-required')
  const verificationId = await verifyDeploymentWork(
    workLogId,
    status,
    qualityScore,
    verifierReference,
    typeof body.evidence === 'object' && body.evidence ? body.evidence : {},
  )
  return json({ verificationId, status }, 201)
})
