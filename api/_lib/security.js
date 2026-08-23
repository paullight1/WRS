import crypto from 'node:crypto'

const REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/
const SENSITIVE_KEY = /(password|passcode|secret|token|authorization|cookie|session|email|phone|amount|wallet|bank|card|biometric|voice|face|movement|document|nin|bvn)/i
const MAX_REDACTION_DEPTH = 6

function sanitizeTelemetryString(value, maxLength = 1000) {
  return String(value)
    .slice(0, maxLength)
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\+[1-9][0-9]{7,14}\b/g, '[REDACTED_PHONE]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk_live_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9_-]{16,})\b/g, '[REDACTED_CREDENTIAL]')
}

export function requestId(request) {
  const supplied = String(request?.headers?.get?.('x-request-id') || request?.headers?.get?.('x-vercel-id') || '').trim()
  return REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID()
}

export function redactTelemetry(value, depth = 0) {
  if (depth > MAX_REDACTION_DEPTH) return '[REDACTED_DEPTH]'
  if (value === null || value === undefined) return value
  if (
    value instanceof Error ||
    (typeof value === 'object' && typeof value?.name === 'string' && typeof value?.message === 'string')
  ) {
    return {
      name: sanitizeTelemetryString(value.name, 100),
      message: sanitizeTelemetryString(value.message, 300),
    }
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactTelemetry(item, depth + 1))
  if (typeof value !== 'object') return typeof value === 'string' ? sanitizeTelemetryString(value) : value

  const output = {}
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactTelemetry(item, depth + 1)
  }
  return output
}

export function validateJsonEnvelope(request, maxBytes = 1_000_000) {
  const method = String(request?.method || 'GET').toUpperCase()
  const declared = Number(request?.headers?.get?.('content-length') || 0)
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, code: 'body-too-large', message: `Request size exceeds maxBytes=${maxBytes}.` }
  }
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true }
  const contentType = String(request?.headers?.get?.('content-type') || '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return { ok: false, status: 415, code: 'content-type', message: 'Content-Type must be application/json.' }
  }
  return { ok: true }
}

export function upstreamTimeoutMs() {
  const configured = Number(process.env.WRS_UPSTREAM_TIMEOUT_MS || 10_000)
  if (!Number.isFinite(configured)) return 10_000
  return Math.max(500, Math.min(30_000, Math.floor(configured)))
}

export async function fetchWithTimeout(input, init = {}, timeoutMs = upstreamTimeoutMs()) {
  const controller = new AbortController()
  const upstreamSignal = init.signal
  let upstreamAbort
  if (upstreamSignal) {
    upstreamAbort = () => controller.abort(upstreamSignal.reason)
    if (upstreamSignal.aborted) upstreamAbort()
    else upstreamSignal.addEventListener('abort', upstreamAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(new DOMException('Upstream timeout', 'TimeoutError')), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    if (upstreamSignal && upstreamAbort) upstreamSignal.removeEventListener('abort', upstreamAbort)
  }
}
