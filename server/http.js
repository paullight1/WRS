import { validateJsonEnvelope } from '../api/_lib/security.js'
import { requestTelemetry } from '../api/_lib/telemetry.js'
import { assertAllowedMutationOrigin, corsResponse, preflightResponse } from '../api/_lib/origins.js'

export class HttpError extends Error {
  constructor(status, message, code = 'request-failed') {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function json(body, status = 200, headers = {}) {
  const responseHeaders = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  })
  return new Response(JSON.stringify(body), { status, headers: responseHeaders })
}

export function redirect(location, status = 303, headers = {}) {
  const responseHeaders = new Headers({ 'cache-control': 'no-store', location, ...headers })
  return new Response(null, { status, headers: responseHeaders })
}

export async function readJson(request, maxBytes = 1_000_000) {
  const envelope = validateJsonEnvelope(request, maxBytes)
  if (!envelope.ok) throw new HttpError(envelope.status, envelope.message, envelope.code)
  let text
  try {
    text = await request.text()
  } catch {
    throw new HttpError(400, 'Request body could not be read.', 'bad-body')
  }
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new HttpError(413, 'Request body is too large.', 'body-too-large')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.', 'bad-json')
  }
}

export function requireMethod(request, allowed) {
  const methods = Array.isArray(allowed) ? allowed : [allowed]
  if (!methods.includes(request.method)) {
    throw new HttpError(405, 'Method not allowed.', 'method-not-allowed')
  }
}

export function assertSameOrigin(request) {
  try {
    assertAllowedMutationOrigin(request)
  } catch (error) {
    throw new HttpError(error.status || 403, error.message || 'Cross-origin request rejected.', error.code || 'csrf')
  }
}

export function parseCookies(request) {
  const value = request.headers.get('cookie') || ''
  const cookies = {}
  for (const segment of value.split(';')) {
    const index = segment.indexOf('=')
    if (index <= 0) continue
    const name = segment.slice(0, index).trim()
    const raw = segment.slice(index + 1).trim()
    try {
      cookies[name] = decodeURIComponent(raw)
    } catch {
      cookies[name] = raw
    }
  }
  return cookies
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path || '/'}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (options.secure !== false) parts.push('Secure')
  parts.push(`SameSite=${options.sameSite || 'Lax'}`)
  if (Number.isFinite(options.maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  if (options.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`)
  return parts.join('; ')
}

export function appendCookies(response, cookies = []) {
  for (const cookie of cookies.filter(Boolean)) response.headers.append('set-cookie', cookie)
  return response
}

export function functionHandler(handler) {
  return {
    async fetch(request) {
      const telemetry = requestTelemetry(request)
      telemetry.info('api.request.started', { method: request.method })
      if (request.method === 'OPTIONS') return corsResponse(request, preflightResponse(request))
      try {
        const response = await handler(request)
        response.headers.set('x-request-id', telemetry.requestId)
        telemetry.info('api.request.completed', {
          method: request.method,
          status: response.status,
          durationMs: telemetry.durationMs(),
        })
        return corsResponse(request, response)
      } catch (error) {
        if (error instanceof HttpError) {
          telemetry.warn('api.request.rejected', {
            method: request.method,
            status: error.status,
            code: error.code,
            durationMs: telemetry.durationMs(),
          })
          return corsResponse(request, json({ message: error.message, code: error.code }, error.status, {
            'x-request-id': telemetry.requestId,
          }))
        }
        telemetry.error('api.request.failed', error, {
          method: request.method,
          status: 500,
          durationMs: telemetry.durationMs(),
        })
        return corsResponse(request, json({ message: 'The service could not complete the request.' }, 500, {
          'x-request-id': telemetry.requestId,
        }))
      }
    },
  }
}
