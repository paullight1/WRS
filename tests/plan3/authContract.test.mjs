import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const requiredFiles = [
  'src/domain/auth/types.ts',
  'src/domain/auth/validation.ts',
  'src/domain/auth/policy.ts',
  'src/services/auth/AuthService.ts',
  'src/infrastructure/auth/supabaseAuthRepository.ts',
  'supabase/migrations/20260821030000_plan3_identity.sql',
]

test('Plan 3 has explicit domain, service, adapter and migration boundaries', () => {
  for (const path of requiredFiles) assert.ok(exists(path), `missing ${path}`)
})

test('identity migration models verification, roles, devices, MFA and audit with RLS', () => {
  const sql = read('supabase/migrations/20260821030000_plan3_identity.sql').toLowerCase()
  for (const table of [
    'user_profiles',
    'user_identities',
    'verification_requests',
    'user_devices',
    'roles',
    'permissions',
    'user_roles',
    'security_events',
    'mfa_recovery_codes',
  ]) assert.ok(sql.includes(table), `migration missing ${table}`)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /normalized_email/)
  assert.match(sql, /normalized_phone/)
  assert.match(sql, /unique/)
})

test('registration and verification screens no longer bypass authoritative auth', () => {
  const register = read('src/screens/Register.jsx')
  const login = read('src/screens/Login.jsx')
  const verify = read('src/screens/Verify.jsx')
  assert.doesNotMatch(login, /onClick=\{\(\) => nav\('\/home'\)\}/)
  assert.doesNotMatch(verify, /onClick=\{\(\) => nav\('\/onboarding'\)\}/)
  assert.match(register, /validateRegistration|auth/i)
  assert.match(login, /auth|session/i)
  assert.match(verify, /verification|challenge|auth/i)
})

test('protected routes use an authentication/verification guard', () => {
  const app = read('src/App.jsx')
  assert.match(app, /AuthProvider/)
  assert.match(app, /ProtectedRoute/)
  assert.match(app, /requireVerified|verified/i)
})

test('MFA and OAuth are service-backed rather than decorative production controls', () => {
  const service = read('src/services/auth/AuthService.ts')
  assert.match(service, /oauth/i)
  assert.match(service, /pkce|state|nonce/i)
  assert.match(service, /mfa|totp|recovery/i)
  assert.match(service, /reset|password/i)
  assert.match(service, /revoke|session/i)
})
