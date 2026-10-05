import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const migration = 'supabase/migrations/20261003182654_admin_operator_role_management.sql'

test('role lookup is exact, permission guarded and never lists Auth users', () => {
  const api = read('api/admin/role-subject.js')
  const sql = read(migration)
  assert.match(api, /requireAdminSession\(request, 'operations.roles'\)/)
  assert.match(api, /wrs_admin_role_subject/)
  assert.doesNotMatch(api, /listUsers|\/auth\/v1\/admin\/users/)
  assert.match(sql, /normalized_email\s*=\s*lower\(v_identifier\)/)
  assert.doesNotMatch(sql, /\bilike\b/i)
  assert.match(sql, /'userId'.*'identifier'.*'roles'/s)
})

test('role mutations are scoped, transactionally audited and deny unsafe assignments', () => {
  const api = read('api/admin/action.js')
  const sql = read(migration)
  assert.match(api, /requireAdminSession\(request, 'operations.roles', \{ stepUp: true \}\)/)
  assert.match(sql, /p_operator_user_id\s*=\s*p_subject_user_id/)
  assert.match(sql, /p_role_slug\s*=\s*'admin'/)
  assert.match(sql, /last active administrator/)
  assert.match(sql, /unsupported operator role/)
  assert.match(sql, /operator reason is required/)
  assert.match(sql, /wrs_operator_has_permission\(p_operator_user_id,'operations.roles'\)/)
  assert.match(sql, /insert into public\.operator_role_audit_events/)
  assert.match(sql, /delete from public\.user_roles/)
  assert.match(sql, /before update or delete or truncate/)
  assert.match(sql, /lock table public\.user_roles in share row exclusive mode/)
})

test('role tables and RPCs cannot be read or written by browser database roles', () => {
  const sql = read(migration)
  assert.match(sql, /operator_role_audit_events enable row level security/)
  assert.match(sql, /revoke all on public\.operator_role_audit_events from public,anon,authenticated,service_role/)
  for (const name of ['wrs_admin_role_subject', 'wrs_admin_set_operator_role', 'wrs_bootstrap_initial_admin']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^;]+from public,anon,authenticated`))
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^;]+to service_role`))
  }
  assert.match(sql, /p_permission\s*<>\s*'operations.roles'/)
})

test('bootstrap requires an explicit project and existing account and refuses existing admins', () => {
  const sql = read(migration)
  const script = read('scripts/bootstrap-initial-admin.mjs')
  assert.match(sql, /an administrator already exists/)
  assert.match(sql, /'bootstrap'/)
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'WRS_EXPECTED_PROJECT_REF',
    'WRS_INITIAL_ADMIN_USER_ID',
  ]) {
    assert.match(script, new RegExp(name))
  }
  assert.match(script, /wrs_bootstrap_initial_admin/)
  assert.doesNotMatch(script, /console\.(?:log|error)\([^\n]*(?:serviceRoleKey|env|response)/)
})
