import test from 'node:test'
import assert from 'node:assert/strict'
import { beginOAuth, resolveOAuthReturnTo } from '../../server/oauth.js'
import { parseCookies } from '../../server/http.js'
import { verifySignedToken } from '../../server/crypto.js'

const apiRequest = new Request('https://worldroboticsystem.com/api/auth/oauth/start', { method: 'POST' })
const adminOrigin = 'https://admin.worldroboticsystem.com'

test('OAuth return target permits an exact configured admin origin and preserves its callback path', () => {
  process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin

  assert.equal(resolveOAuthReturnTo(apiRequest, `${adminOrigin}/auth/callback`), `${adminOrigin}/auth/callback`)
})

test('OAuth without an explicit return target keeps the existing root-app destination', () => {
  assert.equal(resolveOAuthReturnTo(apiRequest), 'https://worldroboticsystem.com/home')
})

test('OAuth rejects an unconfigured sibling origin', () => {
  process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin

  assert.throws(() => resolveOAuthReturnTo(apiRequest, 'https://other.worldroboticsystem.com/auth/callback'), /return origin/i)
})

test('OAuth rejects a relative path that tries to escape the configured origin', () => {
  process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin

  assert.throws(() => resolveOAuthReturnTo(apiRequest, '//evil.example/auth/callback'), /absolute URL/i)
})

test('OAuth signs the validated admin return target into the state cookie', async () => {
  const envNames = ['WRS_ALLOWED_WEB_ORIGINS', 'WRS_OAUTH_PROVIDERS', 'WRS_OAUTH_COOKIE_SECRET', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']
  const previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]))
  const originalFetch = globalThis.fetch
  process.env.WRS_ALLOWED_WEB_ORIGINS = adminOrigin
  process.env.WRS_OAUTH_PROVIDERS = 'google'
  process.env.WRS_OAUTH_COOKIE_SECRET = 'admin-oauth-test-secret'
  process.env.SUPABASE_URL = 'https://database.example.test'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key'
  process.env.SUPABASE_SECRET_KEY = 'service-test-key'
  globalThis.fetch = async () => new Response('', { status: 201 })

  try {
    const result = await beginOAuth(apiRequest, 'google', `${adminOrigin}/auth/callback`)
    const payload = verifySignedToken(parseCookies(new Request(apiRequest.url, { headers: { cookie: result.cookie } })).wrs_oauth, process.env.WRS_OAUTH_COOKIE_SECRET)
    assert.equal(payload.returnTo, `${adminOrigin}/auth/callback`)
  } finally {
    globalThis.fetch = originalFetch
    for (const name of envNames) {
      if (previousEnv[name] === undefined) delete process.env[name]
      else process.env[name] = previousEnv[name]
    }
  }
})
