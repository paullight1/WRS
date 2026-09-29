import { HttpError } from './http.js'
import { serviceRpc } from './supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateMiningStartBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'A mining start request is required.', 'mining-start-invalid')
  }
  const keys = Object.keys(body).sort()
  const allowed = ['idempotencyKey', 'robotId', 'worksiteId']
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
  const robotId = typeof body.robotId === 'string' ? body.robotId.trim() : ''
  const worksiteId = typeof body.worksiteId === 'string' ? body.worksiteId.trim() : ''
  if (
    keys.length !== allowed.length ||
    keys.some((key, index) => key !== allowed[index]) ||
    !UUID.test(robotId) ||
    !UUID.test(worksiteId) ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 200
  ) {
    throw new HttpError(400, 'Send a robot, an approved worksite, and a valid idempotency key.', 'mining-start-invalid')
  }
  return { robotId, worksiteId, idempotencyKey }
}

function miningSnapshotShape(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    data.authoritative !== true ||
    !data.eligibility ||
    typeof data.rbcBalanceAtomic !== 'string' ||
    !(data.atomicScale === null || (Number.isInteger(data.atomicScale) && data.atomicScale >= 0 && data.atomicScale <= 12)) ||
    !Array.isArray(data.robots) ||
    !Array.isArray(data.worksites)
  ) {
    throw new HttpError(502, 'Mining status could not be verified. Please try again.', 'mining-snapshot-invalid')
  }
  return data
}

export async function miningSnapshot(userId) {
  if (!UUID.test(String(userId || ''))) throw new HttpError(401, 'Authentication is required.', 'unauthenticated')
  try {
    await serviceRpc('wrs_settle_due_mining_session', { p_user_id: userId })
  } catch {
    // Keep the authoritative due session visible so the member can retry settlement.
  }
  try {
    const { data } = await serviceRpc('wrs_mining_snapshot', { p_user_id: userId })
    return miningSnapshotShape(data)
  } catch (error) {
    if (error?.upstreamData?.code === 'PGRST202') {
      throw new HttpError(503, 'Mining setup is pending. The 24-hour cycle is not available yet.', 'mining-not-configured')
    }
    throw error
  }
}

export async function startMiningSession(userId, { robotId, worksiteId, idempotencyKey }) {
  if (!UUID.test(String(userId || ''))) throw new HttpError(401, 'Authentication is required.', 'unauthenticated')
  const current = await miningSnapshot(userId)
  if (current.session) return current
  if (!current.eligibility.eligible) return current
  const robot = current.robots.find((item) => item.robotId === robotId)
  if (!robot?.unlocked) throw new HttpError(409, 'This robot is locked until the previous robot completes a full mining cycle.', 'robot-locked')
  const worksite = current.worksites.find((item) => item.worksiteId === worksiteId && item.available)
  if (!worksite) throw new HttpError(409, 'Choose an approved mining worksite.', 'worksite-unavailable')

  await serviceRpc('wrs_start_mining_session', {
    p_user_id: userId,
    p_robot_id: robotId,
    p_worksite_id: worksiteId,
    p_idempotency_key: idempotencyKey,
  })
  return miningSnapshot(userId)
}
