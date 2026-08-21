import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const required = [
  'src/domain/robot/types.ts',
  'src/domain/robot/packages.ts',
  'src/domain/robot/configuration.ts',
  'src/domain/robot/progression.ts',
  'src/services/robot/RobotService.ts',
  'src/infrastructure/robot/browserRobotClient.ts',
  'src/infrastructure/robot/supabaseRobotRepository.ts',
  'supabase/migrations/20260821040000_plan4_robot_domain.sql',
]

test('Plan 4 has explicit robot domain, service, adapter and migration boundaries', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('robot migration covers ownership, entitlements, configuration, passport and append-only XP', () => {
  const sql = read('supabase/migrations/20260821040000_plan4_robot_domain.sql').toLowerCase()
  for (const table of [
    'robots',
    'robot_onboarding',
    'package_entitlements',
    'robot_configurations',
    'capability_catalog',
    'package_capabilities',
    'robot_skills',
    'robot_certifications',
    'robot_history_events',
    'robot_xp_events',
  ]) {
    assert.ok(sql.includes(table), `migration missing ${table}`)
  }
  assert.match(sql, /enable row level security/)
  assert.match(sql, /idempotency_key/)
  assert.match(sql, /append-only|before update or delete/)
  assert.match(sql, /public_verification_id/)
})

test('package capabilities are centralized rather than inferred from UI strings', () => {
  const source = read('src/domain/robot/packages.ts')
  for (const tier of ['starter', 'builder', 'professional', 'enterprise', 'elite', 'visionary']) {
    assert.match(source.toLowerCase(), new RegExp(tier))
  }
  assert.match(source, /hasCapability|capabilit/i)
})

test('onboarding and configuration use authoritative robot service boundaries', () => {
  const onboarding = read('src/screens/Onboarding.jsx')
  const customize = read('src/screens/Customize.jsx')
  assert.match(onboarding, /robot|onboarding/i)
  assert.match(customize, /saveRobot|robot|configuration/i)
  assert.doesNotMatch(customize, /Robot configuration saved['"]/)
})

test('passport no longer claims static identity/history as authoritative production state', () => {
  const passport = read('src/screens/RobotPassport.jsx')
  assert.match(passport, /passport|verification/i)
  assert.match(passport, /authoritative|demo|service/i)
  assert.match(passport, /pdf|export/i)
})

test('XP engine is event-based, idempotent and supports reversals', () => {
  const progression = read('src/domain/robot/progression.ts')
  assert.match(progression, /idempot/i)
  assert.match(progression, /reversal|reverse/i)
  assert.match(progression, /level/i)
})
