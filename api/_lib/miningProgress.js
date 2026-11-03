import { HttpError } from './http.js'
import { serviceRest } from './supabase.js'

const DAY = 86_400_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const midnight = (now) => Math.floor(now / DAY) * DAY

export function aggregateDailyMining(sessions, now = Date.now()) {
  if (!Number.isFinite(now) || !Array.isArray(sessions)) throw new TypeError('Invalid mining progress records.')
  const firstDay = midnight(now) - 6 * DAY
  const days = Array.from({ length: 7 }, (_, index) => ({
    day: new Date(firstDay + index * DAY).toISOString().slice(0, 10),
    miningMilliseconds: 0,
    completedCycles: 0,
  }))
  const intervals = days.map(() => [])
  const seen = new Set()
  for (const session of sessions) {
    if (session.status === 'cancelled') continue
    if (!['active', 'ended', 'settled'].includes(session.status) || typeof session.id !== 'string') {
      throw new TypeError('Invalid mining progress records.')
    }
    if (seen.has(session.id)) continue
    seen.add(session.id)
    const start = Date.parse(session.started_at)
    const end = Date.parse(session.ends_at)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new TypeError('Invalid mining progress records.')
    }
    for (let index = 0; index < days.length; index += 1) {
      const dayStart = firstDay + index * DAY
      const overlapStart = Math.max(dayStart, start)
      const overlapEnd = Math.min(dayStart + DAY, end, now)
      if (overlapEnd > overlapStart) intervals[index].push([overlapStart, overlapEnd])
      if (session.status !== 'active' && end <= now && end >= dayStart && end < dayStart + DAY) {
        days[index].completedCycles += 1
      }
    }
  }
  intervals.forEach((list, index) => {
    list.sort((a, b) => a[0] - b[0])
    let previousEnd = -Infinity
    for (const [start, end] of list) {
      days[index].miningMilliseconds += Math.max(0, end - Math.max(start, previousEnd))
      previousEnd = Math.max(previousEnd, end)
    }
  })
  return { authoritative: true, serverNow: new Date(now).toISOString(), timeZone: 'UTC', days }
}

export async function miningDailyProgress(userId, now = Date.now()) {
  if (!UUID.test(String(userId || ''))) throw new HttpError(401, 'Authentication is required.', 'unauthenticated')
  const firstDay = new Date(midnight(now) - 6 * DAY).toISOString()
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    started_at: `lt.${new Date(now).toISOString()}`,
    ends_at: `gte.${firstDay}`,
    status: 'in.(active,ended,settled)',
    select: 'id,status,started_at,ends_at',
    order: 'started_at.asc,id.asc',
    limit: '1000',
  })
  const { data } = await serviceRest(`/rest/v1/mining_sessions?${params}`)
  // A member has one concurrent six-hour cycle. Fail closed instead of reporting a truncated week.
  if (!Array.isArray(data) || data.length >= 1000) {
    throw new HttpError(502, 'Daily mining progress could not be loaded.', 'mining-progress-unavailable')
  }
  try {
    return aggregateDailyMining(data, now)
  } catch {
    throw new HttpError(502, 'Daily mining progress could not be verified.', 'mining-progress-invalid')
  }
}
