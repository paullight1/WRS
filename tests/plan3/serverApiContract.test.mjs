import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assertSameOrigin, serializeCookie } from '../../api/_lib/http.js'
import { supabaseRequest } from '../../api/_lib/supabase.js'

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

test('every auth endpoint exports a Vercel Fetch handler', async () => {
  for (const path of authEndpoints) {
    const module = await import(new URL(`../../${path}`, import.meta.url))
    assert.equal(typeof module.default?.fetch, 'function', `${path} does not export default.fetch`)
  }
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

test('server Supabase transport fails closed without server credentials', async () => {
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_PUBLIC_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  try {
    for (const key of keys) delete process.env[key]
    await assert.rejects(() => supabaseRequest('/auth/v1/user'), /Supabase configuration is unavailable/)
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
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

test('OTP attempts and MFA recovery codes use atomic database functions', () => {
  const migration = read('supabase/migrations/20260821034000_plan3_auth_atomicity.sql')
  const auth = read('api/_lib/auth.js')
  const mfa = read('api/_lib/mfa.js')
  assert.match(migration, /wrs_consume_verification_attempt/)
  assert.match(migration, /wrs_consume_mfa_recovery_code/)
  assert.match(auth, /serviceRpc\('wrs_consume_verification_attempt'/)
  assert.match(mfa, /serviceRpc\('wrs_consume_mfa_recovery_code'/)
})

test('verification resend requires a signed challenge rather than a user id alone', () => {
  const source = read('api/auth/verification/resend.js')
  assert.match(source, /verifySignedToken/)
  assert.match(source, /challengeId/)
  assert.match(source, /userId/)
  assert.match(source, /kind/)
})

test('one-live challenge and MFA-factor invariants are database-enforced', () => {
  const source = read('supabase/migrations/20260821034100_plan3_security_state_uniqueness.sql')
  assert.match(source, /verification_requests_one_live_idx/)
  assert.match(source, /user_mfa_factors_one_active_idx/)
  assert.match(source, /where consumed_at is null and superseded_at is null/i)
  assert.match(source, /status in \('pending', 'verified'\)/i)
})

test('WRS session metadata is authoritative and revoked sessions cannot refresh back to life', () => {
  const session = read('api/_lib/session.js')
  const logout = read('api/auth/logout.js')
  const reset = read('api/auth/password/reset.js')
  const verify = read('api/auth/verify.js')
  assert.match(session, /recordSessionMetadata/)
  assert.match(session, /metadata\.revoked_at/)
  assert.match(session, /revokeAllUserSessionMetadata/)
  assert.match(session, /previousMetadata\?\.revoked_at/)
  assert.match(logout, /revokeSessionMetadata/)
  assert.match(reset, /revokeAllUserSessionMetadata/)
  assert.match(verify, /revokeAllUserSessionMetadata/)
})

test('OAuth stays opt-in, clears transient state and uses PKCE state and nonce on the server', () => {
  const runtime = read('src/lib/runtimeConfig.js')
  const oauth = read('api/_lib/oauth.js')
  const callback = read('api/auth/oauth/callback.js')
  assert.match(runtime, /VITE_WRS_OAUTH_ENABLED/)
  assert.match(oauth, /WRS_OAUTH_PROVIDERS/)
  assert.match(oauth, /code_challenge/)
  assert.match(oauth, /code_verifier/)
  assert.match(oauth, /state_hash/)
  assert.match(oauth, /nonce_hash/)
  assert.match(callback, /clearOAuthCookie/)
})

test('MFA enrollment cleans expired pending factors and compensates failed storage', () => {
  const mfa = read('api/_lib/mfa.js')
  assert.match(mfa, /PENDING_ENROLLMENT_TTL_MS/)
  assert.match(mfa, /retirePendingFactor/)
  assert.match(mfa, /MFA enrollment provider cleanup failed/)
})

test('quality ownership includes Vercel API functions', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.match(pkg.scripts.lint, /api\/\*\*\/\*\.js/)
  assert.match(pkg.scripts['format:check'], /\bapi\b/)
})
