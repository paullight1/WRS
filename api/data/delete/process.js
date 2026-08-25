import crypto from 'node:crypto'
import { claimNextDeletion, completeDeletion, ownedAsset, ownedAssets } from '../../../server/data.js'
import { deletePrivateObject } from '../../../server/storage.js'
import { functionHandler, HttpError, json, requireMethod } from '../../../server/http.js'

function authorized(request) {
  const expected = String(process.env.WRS_DATA_DELETION_SECRET || '')
  if (!expected) throw new HttpError(503, 'Data deletion worker is not configured.', 'deletion-worker-unavailable')
  const header = request.headers.get('authorization') || ''
  const actual = header.startsWith('Bearer ') ? header.slice(7) : ''
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
}

async function deleteObjects(assets) {
  const concurrency = 10
  let deleted = 0
  for (let index = 0; index < assets.length; index += concurrency) {
    const batch = assets.slice(index, index + concurrency)
    await Promise.all(
      batch.map(async (asset) => {
        await deletePrivateObject(asset.storage_bucket, asset.storage_path)
        deleted += 1
      }),
    )
  }
  return deleted
}

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  if (!authorized(request)) throw new HttpError(401, 'Unauthorized deletion worker request.', 'unauthorized')

  const maxJobs = Math.min(20, Math.max(1, Number(new URL(request.url).searchParams.get('limit') || 5)))
  const outcomes = []

  for (let index = 0; index < maxJobs; index += 1) {
    const job = await claimNextDeletion()
    if (!job) break

    try {
      const assets = job.assetId
        ? [await ownedAsset(job.userId, job.assetId)].filter(Boolean)
        : await ownedAssets(job.userId)
      const deletedObjects = await deleteObjects(assets)
      await completeDeletion(job.requestId, true, {
        deletedObjects,
        scope: job.assetId ? 'asset' : 'all-owned-assets',
        attempt: job.attempt,
      })
      outcomes.push({ requestId: job.requestId, status: 'completed', deletedObjects })
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'storage-deletion-failed'
      await completeDeletion(job.requestId, false, {
        error: message,
        attempt: job.attempt,
      }).catch(() => undefined)
      outcomes.push({ requestId: job.requestId, status: 'retry-scheduled' })
    }
  }

  return json({ processed: outcomes.length, outcomes })
})
