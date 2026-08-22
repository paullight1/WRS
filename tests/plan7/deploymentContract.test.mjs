import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const exists = (path) => fs.existsSync(new URL(path, root))
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')

const required = [
  'src/domain/deployment/types.ts',
  'src/domain/deployment/eligibility.ts',
  'src/domain/deployment/stateMachine.ts',
  'src/services/deployment/DeploymentService.ts',
  'src/infrastructure/deployment/browserDeploymentClient.ts',
  'src/screens/DeployProduction.jsx',
  'src/screens/DeploymentDetailsProduction.jsx',
  'src/screens/ActiveDeploymentProduction.jsx',
  'api/_lib/deployment.js',
  'api/deployments.js',
  'api/deployments/request.js',
  'api/deployments/contract.js',
  'api/deployments/state.js',
  'api/deployments/telemetry.js',
  'api/deployments/match.js',
  'api/deployments/verify-work.js',
  'api/deployments/system-state.js',
  'api/deployments/settle.js',
  'supabase/migrations/20260822070000_plan7_deployment_engine.sql',
  'supabase/migrations/20260822071000_plan7_deployment_hardening.sql',
  'tests/database/plan7-invariants.sql',
]

test('Plan 7 authoritative deployment boundaries exist', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('deployment schema covers opportunities, requests, contracts, work state, telemetry and settlement', () => {
  const sql = read('supabase/migrations/20260822070000_plan7_deployment_engine.sql').toLowerCase()
  for (const table of [
    'deployment_industries',
    'deployment_clients',
    'deployment_opportunities',
    'deployment_requests',
    'deployment_contracts',
    'deployments',
    'deployment_events',
    'deployment_work_logs',
    'deployment_incidents',
    'deployment_settlements',
  ])
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /append-only|before update or delete/)
})

test('eligibility is server-derived from authoritative robot/account evidence', () => {
  const domain = read('src/domain/deployment/eligibility.ts')
  const sql = read('supabase/migrations/20260822070000_plan7_deployment_engine.sql').toLowerCase()
  for (const signal of ['package', 'skill', 'certification', 'quality', 'kyc', 'lifecycle']) {
    assert.match(`${domain}\n${sql}`.toLowerCase(), new RegExp(signal), signal)
  }
  assert.match(sql, /wrs_deployment_eligibility/)
  assert.doesNotMatch(read('api/deployments/request.js'), /body\.eligible|body\.package|body\.quality/)
})

test('request, contract and state transitions are atomic/idempotent server operations', () => {
  const sql = read('supabase/migrations/20260822070000_plan7_deployment_engine.sql').toLowerCase()
  const hardening = read('supabase/migrations/20260822071000_plan7_deployment_hardening.sql').toLowerCase()
  assert.match(sql, /wrs_request_deployment/)
  assert.match(`${sql}\n${hardening}`, /idempotency/)
  assert.match(sql, /wrs_accept_deployment_contract/)
  assert.match(hardening, /idempotency key collision/)
  assert.match(sql, /wrs_transition_deployment/)
  for (const state of ['scheduled', 'active', 'paused', 'completed', 'cancelled', 'failed'])
    assert.match(sql, new RegExp(state))
})

test('contract terms are snapshotted and not inferred from the UI', () => {
  const sql = read('supabase/migrations/20260822070000_plan7_deployment_engine.sql').toLowerCase()
  assert.match(sql, /terms_snapshot/)
  assert.match(sql, /deployment_contract_terms_immutable/)
  assert.match(sql, /rate_minor/)
  assert.match(sql, /currency/)
  assert.match(read('api/deployments/contract.js'), /acceptDeploymentContract/)
})

test('telemetry and incidents are append-only server evidence', () => {
  const sql = read('supabase/migrations/20260822070000_plan7_deployment_engine.sql').toLowerCase()
  assert.match(sql, /deployment_work_logs_append_only/)
  assert.match(sql, /deployment_events_append_only/)
  assert.match(sql, /deployment_incidents_append_only/)
  const api = read('api/deployments/telemetry.js')
  assert.match(api, /requireSession/)
  assert.match(api, /assertSameOrigin/)
  assert.doesNotMatch(api, /body\.earnings|body\.payout|body\.settled|body\.verified/)
})

test('deployment revenue can settle only verified completed work through the Plan 5 ledger', () => {
  const sql = read('supabase/migrations/20260822070000_plan7_deployment_engine.sql').toLowerCase()
  assert.match(sql, /wrs_settle_deployment/)
  assert.match(sql, /wrs_post_ledger_transaction/)
  assert.match(sql, /verified/)
  assert.match(sql, /completed/)
  assert.match(sql, /liability:wallet:/)
  assert.match(read('api/deployments/settle.js'), /settleDeployment/)
})

test('deployment browser mutations derive ownership from the verified session', () => {
  for (const path of [
    'api/deployments/request.js',
    'api/deployments/contract.js',
    'api/deployments/state.js',
    'api/deployments/telemetry.js',
  ]) {
    const source = read(path)
    assert.match(source, /requireSession/, path)
    assert.match(source, /resolved\.user\.id/, path)
    assert.doesNotMatch(source, /body\.userId|body\.ownerUserId/, path)
  }
})

test('completion, work verification and settlement require internal authorization', () => {
  for (const path of [
    'api/deployments/match.js',
    'api/deployments/verify-work.js',
    'api/deployments/system-state.js',
    'api/deployments/settle.js',
  ]) {
    assert.match(read(path), /requireInternalBearer/, path)
  }
  assert.match(read('api/deployments/state.js'), /Owners cannot mark deployments completed or failed/)
})

test('production deployment routes are isolated from demo mock screens', () => {
  for (const path of [
    'src/screens/DeployProduction.jsx',
    'src/screens/DeploymentDetailsProduction.jsx',
    'src/screens/ActiveDeploymentProduction.jsx',
  ]) {
    assert.match(read(path), /browserDeploymentClient/, path)
    assert.doesNotMatch(read(path), /\.\.\/data\/mock\.js/, path)
  }
  const app = read('src/App.jsx')
  assert.match(app, /runtimeConfig\.isDemo \? Deploy : DeployProduction/)
  assert.match(app, /runtimeConfig\.isDemo \? DeploymentDetails : DeploymentDetailsProduction/)
  assert.match(app, /runtimeConfig\.isDemo \? ActiveDeployment : ActiveDeploymentProduction/)
})
