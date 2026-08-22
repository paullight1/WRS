import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { serviceRpc } from '../../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  const expected = String(process.env.WRS_DATA_REVIEW_SECRET || '')
  if (!expected) throw new HttpError(503, 'Data review integration is not configured.', 'review-unavailable')
  if (request.headers.get('authorization') !== `Bearer ${expected}`) throw new HttpError(401, 'Unauthorized review result.', 'unauthorized')
  const body = await readJson(request, 32_000)
  const submissionId = String(body.submissionId || '').trim()
  if (!submissionId) throw new HttpError(400, 'Submission ID is required.', 'submission-required')
  const dimensions = ['completeness', 'accuracy', 'consistency', 'signalQuality', 'reviewerAgreement', 'policyCompliance']
  for (const key of dimensions) {
    const value = Number(body[key])
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new HttpError(400, `Invalid ${key}.`, 'invalid-quality')
  }
  const { data } = await serviceRpc('wrs_review_data_submission', {
    p_submission_id: submissionId,
    p_completeness: Number(body.completeness),
    p_accuracy: Number(body.accuracy),
    p_consistency: Number(body.consistency),
    p_signal_quality: Number(body.signalQuality),
    p_reviewer_agreement: Number(body.reviewerAgreement),
    p_policy_compliance: Number(body.policyCompliance),
    p_notes: body.notes ? String(body.notes).slice(0, 2000) : null,
  })
  return json(data)
})
