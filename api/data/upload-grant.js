import crypto from 'node:crypto'
import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { hasActiveConsent, registerDataAsset } from '../../server/data.js'
import { requireSession } from '../../server/session.js'
import { createSignedUploadGrant } from '../../server/storage.js'

const categoryMime = {
  voice: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/mp4'],
  face: ['image/jpeg', 'image/png', 'video/webm', 'video/mp4'],
  movement: ['video/webm', 'video/mp4', 'application/json'],
  document: ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  text: ['text/plain', 'text/csv', 'application/json'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/webm', 'video/mp4'],
  conversation: ['text/plain', 'application/json', 'audio/webm', 'audio/ogg'],
}

function extensionFor(mimeType) {
  return {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/mp4': 'm4a',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  }[mimeType] || 'bin'
}

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const purposeSlug = String(body.purposeSlug || '').trim().toLowerCase()
  const dataCategory = String(body.dataCategory || '').trim().toLowerCase()
  const mimeType = String(body.mimeType || body.contentType || '').trim().toLowerCase()
  const sizeBytes = Number(body.sizeBytes || body.size)
  const allowed = categoryMime[dataCategory]
  if (!allowed) throw new HttpError(400, 'Unknown data category.', 'invalid-category')
  if (!allowed.includes(mimeType)) throw new HttpError(415, 'File type is not allowed for this data category.', 'invalid-mime')
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 52_428_800) {
    throw new HttpError(413, 'File size exceeds the 50 MB data policy.', 'invalid-size')
  }

  // Server check is backed by the service-role wrs_has_active_consent RPC.
  if (!(await hasActiveConsent(resolved.user.id, purposeSlug, dataCategory))) {
    throw new HttpError(403, 'Active consent is required before capture or upload.', 'consent-required')
  }

  const objectKey = `${resolved.user.id}/${dataCategory}/${Date.now()}-${crypto.randomUUID()}.${extensionFor(mimeType)}`
  const grant = await createSignedUploadGrant(objectKey)
  // Bucket/path are generated server-side. body.path and body.bucket are intentionally ignored.
  const asset = await registerDataAsset(resolved.user.id, {
    purposeSlug,
    dataCategory,
    storageBucket: grant.bucket,
    storagePath: grant.path,
    mimeType,
    sizeBytes,
  })

  return appendCookies(
    json(
      {
        assetId: asset.assetId,
        signedUrl: grant.signedUrl,
        token: grant.token,
        path: grant.path,
        expiresInSeconds: grant.expiresInSeconds,
      },
      201,
    ),
    resolved.cookies,
  )
})
