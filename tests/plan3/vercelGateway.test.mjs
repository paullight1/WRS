import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import gateway, { routeManifest } from '../../api/gateway.js'

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`
    return entry.isDirectory() ? files(path) : [path]
  })
}

test('the single Vercel gateway exposes every preserved endpoint', async () => {
  const endpoints = files('server/routes').filter((path) => path.endsWith('.js'))
  assert.deepEqual([...routeManifest].sort(), endpoints.map((path) => path.replace('server/routes/', '/api/').replace(/\.js$/, '')).sort())
  for (const endpoint of endpoints) {
    const module = await import(new URL(`../../${endpoint}`, import.meta.url))
    assert.equal(typeof module.default.fetch, 'function', endpoint)
  }
  const deployedFiles = files('api').filter((path) => !path.startsWith('api/_'))
  assert.deepEqual(deployedFiles, ['api/gateway.js'])
})

test('gateway serves health with query parameters and trailing slash', async () => {
  const response = await gateway.fetch(new Request('https://wrs.example/api/health/?probe=1'))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'ok')
})

test('unknown API paths return JSON rather than app HTML', async () => {
  const response = await gateway.fetch(new Request('https://wrs.example/api/unknown'))
  assert.equal(response.status, 404)
  assert.equal((await response.json()).code, 'not-found')
})


test('Vercel rewrites dispatch nested API routes and preserve query parameters', async () => {
  const response = await gateway.fetch(new Request('https://wrs.example/api/gateway?__wrs_route=auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://wrs.example' },
    body: '{}',
  }))
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'invalid-credentials')
  const health = await gateway.fetch(new Request('https://wrs.example/api/gateway?__wrs_route=health&probe=1'))
  assert.equal(health.status, 200)
  const unknown = await gateway.fetch(new Request('https://wrs.example/api/gateway?__wrs_route=does/not/exist'))
  assert.equal(unknown.status, 404)
})
