import { HttpError } from './http.js'
import { fetchWithTimeout } from './security.js'
import { telemetryEvent } from './telemetry.js'

function config() {
  const url = String(process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL || '').replace(/\/$/, '')
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '')
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  if (!url || !publishableKey || !secretKey) {
    throw new HttpError(503, 'Authoritative Supabase configuration is unavailable.', 'supabase-unavailable')
  }
  return { url, publishableKey, secretKey }
}

function providerMessage(data, fallback) {
  if (!data || typeof data !== 'object') return fallback
  return data.msg || data.error_description || data.message || data.error || fallback
}

function isTimeout(error) {
  return error?.name === 'TimeoutError' || (error?.name === 'AbortError' && String(error?.message || '').toLowerCase().includes('timeout'))
}

export async function supabaseRequest(path, options = {}) {
  const cfg = config()
  const key = options.key === 'secret' ? cfg.secretKey : cfg.publishableKey
  const headers = new Headers(options.headers || {})
  headers.set('apikey', key)
  headers.set('authorization', `Bearer ${options.token || key}`)
  headers.set('accept', 'application/json')
  if (options.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json')

  let response
  const startedAt = Date.now()
  try {
    response = await fetchWithTimeout(`${cfg.url}${path}`, {
      method: options.method || 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : headers.get('content-type')?.includes('application/json')
            ? JSON.stringify(options.body)
            : options.body,
      redirect: options.redirect || 'manual',
    })
  } catch (error) {
    const timeout = isTimeout(error)
    telemetryEvent('error', timeout ? 'upstream.timeout' : 'upstream.unreachable', {
      service: 'supabase',
      routeFamily: String(path).split('?')[0].slice(0, 160),
      durationMs: Date.now() - startedAt,
      error,
    })
    throw new HttpError(
      timeout ? 504 : 502,
      timeout ? 'Authoritative service timed out.' : 'Authoritative service is unreachable.',
      timeout ? 'upstream-timeout' : 'upstream-unreachable',
    )
  }

  const text = response.status === 204 ? '' : await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    telemetryEvent('warn', 'upstream.rejected', {
      service: 'supabase',
      routeFamily: String(path).split('?')[0].slice(0, 160),
      upstreamStatus: response.status,
      durationMs: Date.now() - startedAt,
    })
    const status = response.status >= 500 ? 502 : response.status
    const message = options.exposeError
      ? providerMessage(data, options.errorMessage || 'Authentication request failed.')
      : options.errorMessage || 'Authoritative service request failed.'
    const error = new HttpError(status, message, options.errorCode || 'upstream-error')
    error.upstreamStatus = response.status
    error.upstreamData = data
    throw error
  }

  return { data, response }
}

export function authPublic(path, options = {}) {
  return supabaseRequest(path, { ...options, key: 'public', exposeError: options.exposeError ?? true })
}

export function authSecret(path, options = {}) {
  return supabaseRequest(path, { ...options, key: 'secret', exposeError: false })
}

export function serviceRest(path, options = {}) {
  return supabaseRequest(path, {
    ...options,
    key: 'secret',
    exposeError: false,
    errorMessage: options.errorMessage || 'Authoritative data request failed.',
  })
}

export function serviceRpc(name, body) {
  return serviceRest(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: 'POST', body })
}

export function supabaseBaseUrl() {
  return config().url
}
