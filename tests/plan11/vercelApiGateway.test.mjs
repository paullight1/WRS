import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import gateway, { routeManifest } from '../../api/[...path].js'

const routeRoot = path.resolve('server/routes')

function routeFiles(directory = routeRoot) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return routeFiles(entryPath)
    return entry.name.endsWith('.js') ? [path.relative(routeRoot, entryPath).replace(/\.js$/, '')] : []
  })
}

test('Vercel API gateway preserves a handler for every former API endpoint', () => {
  assert.deepEqual(routeManifest.map((route) => route.slice('/api/'.length)).sort(), routeFiles().sort())
})

test('every consolidated endpoint module loads with a Fetch handler', async () => {
  const modules = await Promise.all(
    routeFiles().map((route) => import(pathToFileURL(path.join(routeRoot, `${route}.js`)).href)),
  )
  assert.equal(modules.length, routeManifest.length)
  assert.ok(modules.every(({ default: handler }) => typeof handler?.fetch === 'function'))
})

test('Vercel API gateway dispatches API requests to the original endpoint handler', async () => {
  const response = await gateway.fetch(new Request('https://wrs.example/api/health'))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok', release: 'unknown' })
})

test('Vercel API gateway returns a JSON 404 for unknown API paths', async () => {
  const response = await gateway.fetch(new Request('https://wrs.example/api/no-such-route'))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { message: 'API route not found.', code: 'not-found' })
})
