import { afterEach, describe, expect, it } from 'vitest'
import { assertAllowedMutationOrigin, configuredWebOrigins, corsResponse, preflightResponse } from '../../../api/_lib/origins.js'

const apiOrigin = 'https://worldroboticsystem.com'
const adminOrigin = 'https://admin.worldroboticsystem.com'

afterEach(() => {
  delete process.env.WRS_ALLOWED_WEB_ORIGINS
})

function request({ method = 'POST', origin, fetchSite, headers: inputHeaders = {} } = {}) {
  const headers = new Headers(inputHeaders)
  if (origin) headers.set('origin', origin)
  if (fetchSite) headers.set('sec-fetch-site', fetchSite)
  return new Request(`${apiOrigin}/api/example`, { method, headers })
}

describe('configured WRS web origins', () => {
  it('accepts only configured full origins', () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = `${adminOrigin},https://preview.worldroboticsystem.com/path`

    expect(configuredWebOrigins()).toEqual(new Set([adminOrigin]))
  })

  it('accepts same-origin and configured admin mutations', () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin

    expect(() => assertAllowedMutationOrigin(request({ origin: apiOrigin }))).not.toThrow()
    expect(() => assertAllowedMutationOrigin(request({ origin: adminOrigin }))).not.toThrow()
  })

  it('rejects an unconfigured sibling and cross-site mutation', () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin

    expect(() => assertAllowedMutationOrigin(request({ origin: 'https://support.worldroboticsystem.com' }))).toThrow(/cross-origin/i)
    expect(() => assertAllowedMutationOrigin(request({ origin: adminOrigin, fetchSite: 'cross-site' }))).toThrow(/cross-site/i)
  })

  it('preserves requests without an Origin header', () => {
    expect(() => assertAllowedMutationOrigin(request())).not.toThrow()
  })

  it('returns a credentialed exact-origin preflight response', () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin
    const response = preflightResponse(request({
      method: 'OPTIONS',
      origin: adminOrigin,
      headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    }))

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(adminOrigin)
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
    expect(response.headers.get('access-control-allow-headers')).toBe('content-type')
  })

  it('adds CORS headers only to configured cross-origin responses', () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin
    const response = new Response('ok')

    expect(corsResponse(request({ method: 'GET', origin: adminOrigin }), response).headers.get('access-control-allow-origin')).toBe(adminOrigin)
    expect(corsResponse(request({ method: 'GET', origin: 'https://support.worldroboticsystem.com' }), response).headers.get('access-control-allow-origin')).toBeNull()
  })
})
