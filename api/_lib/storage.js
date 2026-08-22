import { HttpError } from './http.js'
import { supabaseBaseUrl, supabaseRequest } from './supabase.js'

const DEFAULT_BUCKET = 'wrs-private-data'

function bucketName() {
  const bucket = String(process.env.WRS_DATA_BUCKET || DEFAULT_BUCKET).trim()
  if (!/^[a-zA-Z0-9._-]{3,63}$/.test(bucket)) throw new HttpError(500, 'Invalid data bucket configuration.', 'storage-config')
  return bucket
}

function encodeStoragePath(path) {
  return String(path)
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
}

export async function createSignedUploadGrant(path) {
  const bucket = bucketName()
  const finalPath = `${bucket}/${String(path).replace(/^\/+/, '')}`
  const { data } = await supabaseRequest(`/storage/v1/object/upload/sign/${encodeStoragePath(finalPath)}`, {
    method: 'POST',
    key: 'secret',
    body: {},
    errorMessage: 'Secure upload grant could not be created.',
  })
  const signedPath = data?.url
  const token = typeof signedPath === 'string' ? new URL(signedPath, supabaseBaseUrl()).searchParams.get('token') : null
  if (!token) throw new HttpError(502, 'Storage did not return a signed upload token.', 'storage-signature')
  return {
    bucket,
    path: String(path).replace(/^\/+/, ''),
    signedUrl: `${supabaseBaseUrl()}/storage/v1/object/upload/sign/${encodeStoragePath(finalPath)}?token=${encodeURIComponent(token)}`,
    token,
    expiresInSeconds: 7200,
  }
}

export async function deletePrivateObject(bucket, path) {
  const { data } = await supabaseRequest('/storage/v1/object/remove', {
    method: 'DELETE',
    key: 'secret',
    body: { bucketId: bucket, prefixes: [path] },
    errorMessage: 'Private data object could not be deleted.',
  })
  return data
}

export async function createSignedDownloadUrl(bucket, path, expiresIn = 900) {
  const finalPath = `${bucket}/${String(path).replace(/^\/+/, '')}`
  const { data } = await supabaseRequest(`/storage/v1/object/sign/${encodeStoragePath(finalPath)}`, {
    method: 'POST',
    key: 'secret',
    body: { expiresIn },
    errorMessage: 'Private data download could not be signed.',
  })
  const signed = data?.signedURL || data?.signedUrl
  if (!signed) throw new HttpError(502, 'Storage did not return a signed download URL.', 'storage-signature')
  return new URL(signed, supabaseBaseUrl()).toString()
}
