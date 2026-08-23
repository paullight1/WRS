import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const exists = (path) => fs.existsSync(new URL(path, root))
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')

const required = [
  'src/domain/account/profile.ts',
  'src/domain/account/settings.ts',
  'src/services/account/AccountService.ts',
  'src/infrastructure/account/browserAccountClient.ts',
  'api/_lib/account.js',
  'api/account.js',
  'api/account/profile.js',
  'api/account/settings.js',
  'api/account/delete.js',
  'api/support.js',
  'api/support/ticket.js',
  'api/support/attachment.js',
  'api/knowledge-base.js',
  'api/admin/operations.js',
  'api/admin/action.js',
  'src/screens/ProfileProduction.jsx',
  'src/screens/SettingsProduction.jsx',
  'src/screens/SupportProduction.jsx',
  'src/screens/AdminOperationsProduction.jsx',
  'src/screens/AccountDeletionRecoveryProduction.jsx',
  'supabase/migrations/20260822090000_plan9_account_operations.sql',
  'tests/database/plan9-invariants.sql',
]

test('Plan 9 authoritative account and operations boundaries exist', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('profile and settings are persisted server-side and sensitive identity changes require recent MFA', () => {
  const sql = read('supabase/migrations/20260822090000_plan9_account_operations.sql').toLowerCase()
  assert.match(sql, /user_settings/)
  assert.match(sql, /wrs_update_profile/)
  assert.match(sql, /wrs_update_user_settings/)
  assert.match(sql, /mfa_satisfied_at/)
  assert.match(sql, /interval '10 minutes'/)
  const profile = read('api/account/profile.js')
  assert.match(profile, /requireSession/)
  assert.doesNotMatch(profile, /body\.(?:kycStatus|status|roles)/)
})

test('account deletion is a durable queue that revokes sessions and preserves required ledgers/audit evidence', () => {
  const sql = read('supabase/migrations/20260822090000_plan9_account_operations.sql').toLowerCase()
  assert.match(sql, /account_deletion_requests/)
  assert.match(sql, /wrs_request_account_deletion/)
  assert.match(sql, /wrs_finalize_account_deletion/)
  assert.match(sql, /user_sessions/)
  assert.match(sql, /revoked_at/)
  assert.match(sql, /status='deleted'|status = 'deleted'/)
  assert.match(sql, /anonym/)
  assert.doesNotMatch(sql, /delete from public\.ledger_entries/)
  assert.doesNotMatch(sql, /delete from public\.security_events/)
  assert.match(read('api/account/delete.js'), /assertSameOrigin/)
})

test('pending account deletion blocks ordinary APIs but permits explicit recovery and MFA step-up', () => {
  const session = read('api/_lib/session.js')
  const stepUp = read('api/auth/mfa/step-up.js')
  assert.match(session, /accountDeletionPending/)
  assert.match(session, /allowDeletionPending/)
  assert.match(read('api/account.js'), /allowDeletionPending/)
  assert.match(read('api/account/delete.js'), /allowDeletionPending/)
  assert.match(stepUp, /allowDeletionPending/)
  assert.match(stepUp, /verifyMfa/)
  assert.match(stepUp, /user_mfa_factors/)
  assert.doesNotMatch(read('api/wallet.js'), /allowDeletionPending/)
  const app = read('src/App.jsx')
  assert.match(app, /account-recovery/)
  assert.match(app, /\/account\/deletion/)
})

test('support tickets, replies and private attachments are durable and abuse-limited', () => {
  const sql = read('supabase/migrations/20260822090000_plan9_account_operations.sql').toLowerCase()
  for (const table of ['support_tickets', 'support_messages', 'support_attachments']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  }
  assert.match(sql, /wrs_create_support_ticket/)
  assert.match(sql, /wrs_add_support_message/)
  assert.match(sql, /wrs_staff_update_support_ticket/)
  const ticket = read('api/support/ticket.js')
  const attachment = read('api/support/attachment.js')
  assert.match(ticket, /requireSession/)
  assert.match(ticket, /enforceRateLimit/)
  assert.doesNotMatch(ticket, /fake|48213|setTimeout/i)
  assert.match(attachment, /createSignedUploadGrant/)
  assert.match(attachment, /support_attachments/)
  assert.match(attachment, /10_485_760/)
  assert.match(attachment, /enforceRateLimit/)
  assert.doesNotMatch(attachment, /body\.(?:storageBucket|storagePath)/)
})

test('knowledge base is server-published searchable content, not decorative rows', () => {
  const sql = read('supabase/migrations/20260822090000_plan9_account_operations.sql').toLowerCase()
  assert.match(sql, /knowledge_base_articles/)
  assert.match(sql, /status.*published/s)
  assert.match(read('api/knowledge-base.js'), /knowledgeBaseSearch/)
})

test('least-privilege operations routes require operator roles, server permissions and a discoverable console', () => {
  const sql = read('supabase/migrations/20260822090000_plan9_account_operations.sql').toLowerCase()
  assert.match(sql, /operations_audit_events/)
  assert.match(sql, /append-only/)
  assert.match(sql, /wrs_record_operations_action/)
  for (const path of ['api/admin/operations.js', 'api/admin/action.js']) {
    const source = read(path)
    assert.match(source, /requireAdminSession/, path)
  }
  const policy = read('src/domain/auth/policy.ts')
  assert.match(policy, /operations/)
  assert.match(policy, /support_operator/)
  assert.match(policy, /finance_operator/)
  const app = read('src/App.jsx')
  assert.match(app, /policy="operations"|operations\(/)
  assert.match(app, /\/admin\/operations/)
  assert.match(read('src/screens/More.jsx'), /\/admin\/operations/)
})

test('production profile, settings and support screens are isolated from mock data and use the account client', () => {
  for (const path of [
    'src/screens/ProfileProduction.jsx',
    'src/screens/SettingsProduction.jsx',
    'src/screens/SupportProduction.jsx',
    'src/screens/AdminOperationsProduction.jsx',
  ]) {
    const source = read(path)
    assert.match(source, /browserAccountClient/, path)
    assert.doesNotMatch(source, /\.\.\/data\/mock\.js/, path)
  }
})
