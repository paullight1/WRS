import { assessAcademyEnrollment } from '../../server/ecosystem.js'
import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { requireInternalBearer } from '../../server/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_ACADEMY_ASSESSOR_TOKEN')
  const body = await readJson(request, 24_000)
  const enrollmentId = String(body.enrollmentId || '').trim()
  const score = Number(body.score)
  const assessorReference = String(body.assessorReference || '').trim()
  const evidence = typeof body.evidence === 'object' && body.evidence ? body.evidence : {}
  if (!enrollmentId || !assessorReference) throw new HttpError(400, 'Assessment identity is required.', 'assessment-required')
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new HttpError(400, 'Assessment score must be between 0 and 100.', 'invalid-score')
  }
  const result = await assessAcademyEnrollment(enrollmentId, score, assessorReference, evidence)
  return json(result, 201)
})
