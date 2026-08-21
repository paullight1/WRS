import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createPassportPdf } from '../../api/_lib/pdf.js'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const endpoints = [
  'api/robot.js',
  'api/robot/onboarding.js',
  'api/robot/onboarding/complete.js',
  'api/robot/configuration.js',
  'api/robot/passport.js',
  'api/robot/passport/pdf.js',
  'api/robot/passport/verify.js',
]

test('Plan 4 authoritative server endpoints exist', () => {
  for (const path of endpoints) assert.ok(exists(path), `missing ${path}`)
  assert.ok(exists('api/_lib/robot.js'))
  assert.ok(exists('api/_lib/pdf.js'))
})

test('robot ownership is derived from the verified session instead of client owner ids', () => {
  for (const path of [
    'api/robot.js',
    'api/robot/onboarding.js',
    'api/robot/onboarding/complete.js',
    'api/robot/configuration.js',
    'api/robot/passport.js',
    'api/robot/passport/pdf.js',
  ]) {
    const source = read(path)
    assert.match(source, /requireSession/)
    assert.match(source, /resolved\.user\.id/)
    assert.doesNotMatch(source, /body\.ownerUserId|body\.userId/)
  }
})

test('onboarding and configuration writes call the atomic service-role RPCs', () => {
  const onboarding = read('api/robot/onboarding/complete.js')
  const configuration = read('api/robot/configuration.js')
  assert.match(onboarding, /wrs_complete_robot_onboarding/)
  assert.match(onboarding, /onboarding:\$\{resolved\.user\.id\}:v1/)
  assert.match(configuration, /wrs_save_robot_configuration/)
  assert.match(configuration, /p_expected_version/)
})

test('passport reads use authoritative projections and public verification is privacy-safe', () => {
  assert.match(read('api/robot/passport.js'), /wrs_get_robot_passport/)
  assert.match(read('api/robot/passport/verify.js'), /wrs_verify_robot_passport/)
  const migration = read('supabase/migrations/20260821043000_plan4_passport_projection.sql').toLowerCase()
  assert.doesNotMatch(migration, /wallet_balance|bank_account|owner_email|normalized_email/)
  assert.match(migration, /deliberately excludes owner identity, financial records and private event metadata/)
})

test('passport PDF descriptors are signed and short-lived', () => {
  const source = read('api/robot/passport/pdf.js')
  assert.match(source, /signedToken/)
  assert.match(source, /verifySignedToken/)
  assert.match(source, /5 \* 60_000/)
  assert.match(source, /application\/pdf/)
  assert.match(source, /content-disposition/)
})

test('server PDF generator emits a valid PDF envelope with verification metadata', () => {
  const buffer = createPassportPdf(
    {
      name: 'WRS Test',
      robotId: 'robot-1',
      publicVerificationId: 'verify-1',
      robotClass: 'Professional Robot',
      packageSlug: 'professional',
      lifecycle: 'active',
      activationDate: '2026-08-21T00:00:00.000Z',
      level: 4,
      totalXp: 1250,
      issuedAt: '2026-08-21T00:00:00.000Z',
      skills: [],
      certifications: [],
    },
    'https://wrs.example/api/robot/passport/verify?verificationId=verify-1',
  )
  const source = buffer.toString('utf8')
  assert.ok(source.startsWith('%PDF-1.7'))
  assert.match(source, /PUBLIC VERIFICATION/)
  assert.match(source, /WRS Test/)
  assert.match(source, /%%EOF/)
})

test('robot mutation endpoints enforce same-origin checks', () => {
  for (const path of ['api/robot/onboarding.js', 'api/robot/onboarding/complete.js', 'api/robot/configuration.js', 'api/robot/passport/pdf.js']) {
    assert.match(read(path), /assertSameOrigin/, path)
  }
})
