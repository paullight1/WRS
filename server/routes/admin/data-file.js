import { requireAdminSession } from '../../../api/_lib/account.js'
import { appendCookies, functionHandler, HttpError, redirect, requireMethod } from '../../../api/_lib/http.js'
import { serviceRest } from '../../../api/_lib/supabase.js'
import { createSignedDownloadUrl } from '../../../api/_lib/storage.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DOWNLOAD_TTL_SECONDS = 300
const REVIEWABLE_STATUSES = ['submitted', 'processing', 'review', 'approved', 'rejected']

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireAdminSession(request, 'operations.data')
  const assetId = new URL(request.url).searchParams.get('assetId')?.trim() || ''
  if (!UUID.test(assetId)) throw new HttpError(400, 'Choose a valid submitted file.', 'asset-required')

  const { data } = await serviceRest(
    `/rest/v1/data_assets?id=eq.${encodeURIComponent(assetId)}&status=in.(${REVIEWABLE_STATUSES.join(',')})&scan_status=eq.clean&select=id,storage_bucket,storage_path,status,scan_status&limit=1`,
  )
  const asset = Array.isArray(data) ? data[0] || null : null
  if (!asset || asset.scan_status !== 'clean' || !REVIEWABLE_STATUSES.includes(asset.status))
    throw new HttpError(404, 'This data file is unavailable.', 'data-file-not-found')
  if (!asset.storage_bucket || !asset.storage_path) {
    throw new HttpError(502, 'This data file is unavailable.', 'data-file-unavailable')
  }

  const signedUrl = await createSignedDownloadUrl(asset.storage_bucket, asset.storage_path, DOWNLOAD_TTL_SECONDS)
  return appendCookies(redirect(signedUrl, 302), resolved.cookies)
})
