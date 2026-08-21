import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assertSameOrigin, serializeCookie } from '../../api/_lib/http.js'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const authEndpoints = [
  'api/auth/session.js',
  'api/auth/register.js',
  'api/auth/login.js',
  'api/auth/logout.js',
  'api/auth/verify.js',
  'api/auth/verification/start.js',
  'api/auth/verification/resend.js',
  'api/auth/password/forgot.js',
  'api/auth/password/reset.js',
  'api/auth/oauth/start.js',
  'api/auth/oauth/callback.js',
  'api/auth/mfa/enroll.js',
  'api/auth/mfa/verify.js',
  'api/auth/mfa/disable.js',
]

test('Plan 3 same-origin server endpoint surface is complete', () => {
  for (const path of authEndpoints) assert.ok(exists(path), `missing ${path}`)
  assert.ok(exists('api/_lib/session.js'))
  assert.ok(exists('api/_lib/auth.js'))
  assert.ok(exists('api/_lib/mfa.js'))
  assert.ok(exists('api/_lib/oauth.js'))
})

test('auth cookies are HTTP-only, same-site and secure by default', () => {
  const value = serializeCookie('session', 'opaque')
  assert.match(value, /HttpOnly/)
  assert.match(value, /Secure/)
  assert.match(value, /SameSite=Lax/)
})

test('mutation CSRF guard rejects explicit cross-site requests', () => {
  const request = new Request('https://wrs.example/api/auth/login', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' },
  })
  assert.throws(() => assertSameOrigin(request), /Cross-site|Cross-origin/)
})

test('server Supabase secret keys never enter client source', () => {
  const clientPaths = [
    'src/lib/runtimeConfig.js',
    'src/infrastructure/auth/browserAuthClient.ts',
    'src/infrastructure/robot/browserRobotClient.ts',
  ]
  for (const path of clientPaths) {
    const source = read(path)
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i, path)
  }
  const server = read('api/_lib/supabase.js')
  assert.match(server, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(server, /VITE_SUPABASE/i)
})

test('registration/login/reset use distributed rate limiting', () => {
  const migration = read('supabase/migrations/20260821033000_plan3_rate_limits.sql')
  assert.match(migration, /auth_rate_limit_buckets/)
  assert.match(migration, /wrs_consume_auth_rate_limit/)
  for (const path of ['api/auth/register.js', 'api/auth/login.js', 'api/auth/password/forgot.js', 'api/auth/password/reset.js']) {
    assert.match(read(path), /enforceRateLimit/, path)
  }
})

test('verification resend requires a signed challenge rather than a user id alone', () => {
  const source = read('api/auth/verification/resend.js')
  assert.match(source, /verifySignedToken/)
  assert.match(source, /challengeId/)
  assert.match(source, /userId/)
  assert.match(source, /kind/)
})

test('OAuth stays opt-in and uses PKCE state and nonce on the server', () => {
  const runtime = read('src/lib/runtimeConfig.js')
  const oauth = read('api/_lib/oauth.js')
  assert.match(runtime, /VITE_WRS_OAUTH_ENABLED/)
  assert.match(oauth, /WRS_OAUTH_PROVIDERS/)
  assert.match(oauth, /code_challenge/)
  assert.match(oauth, /code_verifier/)
  assert.match(oauth, /state_hash/)
  assert.match(oauth, /nonce_hash/)
})

test('quality ownership includes Vercel API functions', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.match(pkg.scripts.lint, /api\/\*\*\/\*\.js/)
  assert.match(pkg.scripts['format:check'], /\bapi\b/)
})
