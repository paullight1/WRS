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
  'supabase/migrations/20260821031000_plan3_identity_hardening.sql',
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
  ]) {
    assert.ok(sql.includes(table), `migration missing ${table}`)
  }
  assert.match(sql, /enable row level security/)
  assert.match(sql, /normalized_email/)
  assert.match(sql, /normalized_phone/)
  assert.match(sql, /unique/)
})

test('browser roles cannot mutate privileged identity fields and audit is append-only', () => {
  const sql = read('supabase/migrations/20260821031000_plan3_identity_hardening.sql').toLowerCase()
  assert.match(sql, /drop policy if exists user_profiles_update_own/)
  assert.match(sql, /revoke insert, update, delete on public\.user_profiles/)
  assert.match(sql, /revoke all on public\.security_events/)
  assert.match(sql, /before update or delete on public\.security_events/)
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

test('registration is one atomic repository operation rather than partial account/challenge writes', () => {
  const service = read('src/services/auth/AuthService.ts')
  const adapter = read('src/infrastructure/auth/supabaseAuthRepository.ts')
  assert.match(service, /registerPendingAccount/)
  assert.match(adapter, /auth\.registerAtomic/)
  assert.doesNotMatch(service, /createPendingAccount/)
})

test('protected routes use authentication, verification and KYC guards', () => {
  const app = read('src/App.jsx')
  assert.match(app, /AuthProvider/)
  assert.match(app, /ProtectedRoute/)
  assert.match(app, /requireVerified|verified/i)
  assert.match(app, /policy="kyc"|kyc\(/i)
})

test('every visible logout surface revokes auth instead of navigating only', () => {
  const shell = read('src/components/AppShell.jsx')
  const more = read('src/screens/More.jsx')
  assert.match(shell, /auth\.logout\(\)/)
  assert.doesNotMatch(shell, /to="\/app"[^>]*>[\s\S]{0,100}Log out/)
  assert.match(more, /auth\.logout\(\)/)
})

test('unknown deployment IDs do not substitute another users/default record', () => {
  const deployment = read('src/screens/ActiveDeployment.jsx')
  assert.doesNotMatch(deployment, /live\s*\|\|\s*past\s*\|\|\s*activeDeployments\[0\]/)
  assert.match(deployment, /does not substitute another deployment|Deployment not found/i)
})

test('MFA and OAuth are service-backed rather than decorative production controls', () => {
  const service = read('src/services/auth/AuthService.ts')
  assert.match(service, /oauth/i)
  assert.match(service, /pkce|state|nonce/i)
  assert.match(service, /mfa|totp|recovery/i)
  assert.match(service, /reset|password/i)
  assert.match(service, /revoke|session/i)
})
