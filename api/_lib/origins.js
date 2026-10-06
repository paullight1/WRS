const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
const allowedHeaders = new Set(['authorization', 'content-type', 'x-csrf-token', 'x-request-id'])

function originError(message) {
  const error = new Error(message)
  error.status = 403
  error.code = 'csrf'
  return error
}

function normalizedOrigin(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

export function configuredWebOrigins() {
  const values = String(process.env.WRS_ALLOWED_WEB_ORIGINS || '')
    .split(/[\s,]+/)
    .map((value) => normalizedOrigin(value.trim()))
    .filter(Boolean)
  return new Set(values)
}

function requestOrigin(request) {
  const value = request.headers.get('origin')
  if (!value) return null
  const origin = normalizedOrigin(value)
  if (!origin || value !== origin) throw originError('Invalid request origin.')
  return origin
}

function allowedForRequest(request, origin) {
  return origin === new URL(request.url).origin || configuredWebOrigins().has(origin)
}

export function assertAllowedMutationOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw originError('Cross-site request rejected.')
  const origin = requestOrigin(request)
  if (!origin) return
  if (!allowedForRequest(request, origin)) throw originError('Cross-origin request rejected.')
}

function corsHeaders(origin) {
  return new Headers({
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-expose-headers': 'x-request-id',
    vary: 'Origin',
  })
}

export function corsResponse(request, response) {
  let origin
  try {
    origin = requestOrigin(request)
  } catch {
    return response
  }
  if (!origin || origin === new URL(request.url).origin || !configuredWebOrigins().has(origin)) return response

  const headers = new Headers(response.headers)
  for (const [name, value] of corsHeaders(origin)) headers.set(name, value)
  const vary = response.headers.get('vary')
  if (vary && !vary.split(',').some((item) => item.trim().toLowerCase() === 'origin')) headers.set('vary', `${vary}, Origin`)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function preflightError(message, status = 403) {
  return new Response(JSON.stringify({ message, code: 'cors' }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export function preflightResponse(request) {
  let origin
  try {
    origin = requestOrigin(request)
  } catch (error) {
    return preflightError(error.message)
  }
  if (!origin) return new Response(null, { status: 204 })
  if (!allowedForRequest(request, origin)) return preflightError('Cross-origin request rejected.')

  const method = (request.headers.get('access-control-request-method') || '').toUpperCase()
  if (!allowedMethods.has(method)) return preflightError('Requested method is not allowed.', 405)
  const requestedHeaders = (request.headers.get('access-control-request-headers') || '')
    .split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean)
  if (requestedHeaders.some((header) => !allowedHeaders.has(header))) return preflightError('Requested headers are not allowed.')

  const headers = corsHeaders(origin)
  headers.set('access-control-allow-methods', [...allowedMethods].join(', '))
  headers.set('access-control-allow-headers', requestedHeaders.join(', '))
  headers.set('access-control-max-age', '600')
  return new Response(null, { status: 204, headers })
}
