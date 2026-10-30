import { HttpError } from '../api/_lib/http.js'
import { serviceRest, serviceRpc } from '../api/_lib/supabase.js'

// Reject unavailable or withdrawn submissions before invoking the legacy scorer.
export async function assertReviewableSubmission(submissionId) {
  const { data: submissions } = await serviceRest(
    `/rest/v1/data_submissions?id=eq.${encodeURIComponent(submissionId)}&select=id,user_id,asset_id,status&limit=1`,
  )
  const submission = Array.isArray(submissions) ? submissions[0] : null
  const states = ['submitted', 'processing', 'review', 'approved', 'rejected']
  if (!submission || !states.includes(submission.status))
    throw new HttpError(409, 'This submission is no longer available for review.', 'submission-unavailable')
  const { data: assets } = await serviceRest(
    `/rest/v1/data_assets?id=eq.${encodeURIComponent(submission.asset_id)}&select=id,user_id,purpose_slug,data_category,status,scan_status&limit=1`,
  )
  const asset = Array.isArray(assets) ? assets[0] : null
  if (!asset || asset.user_id !== submission.user_id || !states.includes(asset.status) || asset.scan_status !== 'clean')
    throw new HttpError(
      409,
      'The submitted file must be available and pass its safety check before review.',
      'asset-unavailable',
    )
  const { data: consent } = await serviceRpc('wrs_has_active_consent', {
    p_user_id: submission.user_id,
    p_purpose_slug: asset.purpose_slug,
    p_data_category: asset.data_category,
  })
  if (consent !== true)
    throw new HttpError(409, 'The user has withdrawn permission to use this data.', 'consent-required')
}
