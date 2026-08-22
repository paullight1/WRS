import { serviceRest, serviceRpc } from './supabase.js'

export async function recordConsent(userId, input) {
  const { data } = await serviceRpc('wrs_record_consent', {
    p_user_id: userId,
    p_purpose_slug: input.purposeSlug,
    p_policy_version: input.policyVersion,
    p_data_category: input.dataCategory,
    p_action: input.action,
    p_jurisdiction: input.jurisdiction || null,
    p_context: input.context || {},
  })
  return { eventId: Number(data) }
}

export async function hasActiveConsent(userId, purposeSlug, dataCategory) {
  const { data } = await serviceRpc('wrs_has_active_consent', {
    p_user_id: userId,
    p_purpose_slug: purposeSlug,
    p_data_category: dataCategory,
  })
  return Boolean(data)
}

export async function registerDataAsset(userId, input) {
  const { data } = await serviceRpc('wrs_register_data_asset', {
    p_user_id: userId,
    p_purpose_slug: input.purposeSlug,
    p_data_category: input.dataCategory,
    p_storage_bucket: input.storageBucket,
    p_storage_path: input.storagePath,
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
  })
  return { assetId: String(data) }
}

export async function markDataAssetUploaded(assetId, checksumSha256 = null, scanStatus = 'pending') {
  await serviceRpc('wrs_mark_data_asset_uploaded', {
    p_asset_id: assetId,
    p_checksum_sha256: checksumSha256,
    p_scan_status: scanStatus,
  })
}

export async function submitDataAsset(userId, assetId, metadata) {
  const { data } = await serviceRpc('wrs_submit_data_asset', {
    p_user_id: userId,
    p_asset_id: assetId,
    p_metadata: metadata || {},
  })
  return { submissionId: String(data) }
}

export async function ownedAsset(userId, assetId) {
  const { data } = await serviceRest(
    `/rest/v1/data_assets?id=eq.${encodeURIComponent(assetId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

export async function requestDeletion(userId, assetId, reason) {
  const { data } = await serviceRpc('wrs_request_data_deletion', {
    p_user_id: userId,
    p_asset_id: assetId || null,
    p_reason: reason || null,
  })
  return { requestId: String(data) }
}

export async function completeDeletion(requestId, storageDeleted, auditSummary) {
  await serviceRpc('wrs_complete_data_deletion', {
    p_request_id: requestId,
    p_storage_deleted: storageDeleted,
    p_audit_summary: auditSummary || {},
  })
}

export async function prepareExport(userId) {
  const { data } = await serviceRpc('wrs_prepare_data_export', { p_user_id: userId })
  return data
}

export async function dataRevenue(userId) {
  const { data } = await serviceRest(
    `/rest/v1/contributor_allocations?contributor_user_id=eq.${encodeURIComponent(userId)}&select=id,amount_minor,currency,status,created_at,distributed_at,dataset_licenses!inner(external_reference,customer_reference,status)&order=created_at.desc&limit=100`,
  )
  return Array.isArray(data) ? data : []
}

export async function distributeDatasetLicense(licenseId) {
  const { data } = await serviceRpc('wrs_distribute_dataset_license', { p_license_id: licenseId })
  return data
}
