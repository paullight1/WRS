import { createHmac, randomBytes } from 'node:crypto'

const localSecret = randomBytes(32)
const buckets = new Map()
const MAX_BUCKETS = 10_000
let lastPruneAt = 0
let didWarn = false

function pruneBuckets(now) {
  if (now - lastPruneAt < 60_000 && buckets.size < MAX_BUCKETS) return
  lastPruneAt = now
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key)
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value
    if (oldest === undefined) break
    buckets.delete(oldest)
  }
}

export function consumeLocalRateLimit(request, action, subject, limit, windowSeconds) {
  if (!didWarn) {
    didWarn = true
    console.warn('[WRS] Local API is using process-local rate limits; production uses the PostgreSQL limiter.')
  }

  const windowMs = Math.max(1_000, Number(windowSeconds) * 1_000)
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const ip = forwarded.split(',')[0].trim()
  const input = `${action}|${String(subject || '').trim().toLowerCase()}|${ip}`
  const digest = createHmac('sha256', localSecret).update(input).digest('hex')
  const key = `${action}:${digest}:${windowStart}`

  pruneBuckets(now)
  const bucket = buckets.get(key)
  if (bucket) {
    if (bucket.count >= limit) return false
    bucket.count += 1
    return true
  }

  buckets.set(key, { count: 1, expiresAt: windowStart + windowMs })
  return true
}
