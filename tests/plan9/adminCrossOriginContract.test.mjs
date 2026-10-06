import test from 'node:test'
import assert from 'node:assert/strict'
import { functionHandler as apiHandler, json as apiJson, assertSameOrigin as assertApiOrigin } from '../../api/_lib/http.js'
import { functionHandler as serverHandler, json as serverJson, assertSameOrigin as assertServerOrigin } from '../../server/http.js'

const adminOrigin = 'https://admin.worldroboticsystem.com'
const apiOrigin = 'https://worldroboticsystem.com'

function request(path, { method = 'GET', origin = adminOrigin, headers = {} } = {}) {
  const requestHeaders = new Headers(headers)
  if (origin) requestHeaders.set('origin', origin)
  return new Request(`${apiOrigin}${path}`, { method, headers: requestHeaders })
}

for (const [label, handlerFactory, json, assertOrigin] of [
  ['api', apiHandler, apiJson, assertApiOrigin],
  ['server', serverHandler, serverJson, assertServerOrigin],
]) {
  test(`${label} handler short-circuits OPTIONS and returns credentialed preflight headers`, async () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin
    let routeCalls = 0
    const handler = handlerFactory(async () => {
      routeCalls += 1
      return json({ ok: true })
    })
    const response = await handler.fetch(request('/api/admin/operations', {
      method: 'OPTIONS',
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    }))

    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), adminOrigin)
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
    assert.match(response.headers.get('access-control-allow-methods'), /POST/)
    assert.match(response.headers.get('access-control-allow-headers'), /content-type/i)
    assert.equal(routeCalls, 0)
  })

  test(`${label} handler CORS-wraps errors and rejects mutations from unknown sibling origins`, async () => {
    process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin
    const handler = handlerFactory(async (req) => {
      assertOrigin(req)
      return json({ ok: false }, 403)
    })
    const allowed = await handler.fetch(request('/api/example', { method: 'POST' }))
    const unknown = await handler.fetch(request('/api/example', { method: 'POST', origin: 'https://support.worldroboticsystem.com' }))
    const body = await unknown.json()

    assert.equal(allowed.status, 403)
    assert.equal(allowed.headers.get('access-control-allow-origin'), adminOrigin)
    assert.equal(unknown.status, 403)
    assert.equal(unknown.headers.get('access-control-allow-origin'), null)
    assert.equal(body.code, 'csrf')
  })
}

test('the standard API helper continues accepting legacy clients without an Origin header', () => {
  assert.doesNotThrow(() => assertApiOrigin(request('/api/example', { method: 'POST', origin: null })))
})

test('same-origin API responses keep their existing headers while configured admin responses are readable', async () => {
  process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin
  const handler = apiHandler(async () => apiJson({ message: 'not found' }, 404))
  const sameOrigin = await handler.fetch(request('/api/example', { origin: apiOrigin }))
  const admin = await handler.fetch(request('/api/example'))

  assert.equal(sameOrigin.status, 404)
  assert.equal(sameOrigin.headers.get('access-control-allow-origin'), null)
  assert.equal(admin.status, 404)
  assert.equal(admin.headers.get('access-control-allow-origin'), adminOrigin)
})
