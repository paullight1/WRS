import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const exists = (path) => fs.existsSync(new URL(path, root))
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')

const required = [
  'src/domain/ecosystem/marketplace.ts',
  'src/domain/ecosystem/rewards.ts',
  'src/services/ecosystem/EcosystemService.ts',
  'src/infrastructure/ecosystem/browserEcosystemClient.ts',
  'api/_lib/ecosystem.js',
  'api/marketplace.js',
  'api/marketplace/purchase.js',
  'api/marketplace/install.js',
  'api/marketplace/review.js',
  'api/rewards.js',
  'api/rewards/event-code.js',
  'api/rewards/boost.js',
  'api/academy.js',
  'api/academy/progress.js',
  'api/certificates/verify.js',
  'api/community.js',
  'api/community/event.js',
  'api/community/moderate.js',
  'api/referrals.js',
  'api/referrals/accept.js',
  'api/referrals/qualify.js',
  'supabase/migrations/20260822080000_plan8_ecosystem.sql',
  'tests/database/plan8-invariants.sql',
]

test('Plan 8 authoritative ecosystem boundaries exist', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('marketplace ownership is versioned and distinct from installation', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  for (const table of [
    'marketplace_publishers',
    'marketplace_items',
    'marketplace_versions',
    'marketplace_entitlements',
    'marketplace_installs',
    'marketplace_reviews',
  ]) assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  assert.match(sql, /version/)
  assert.match(sql, /entitlement/)
  assert.match(sql, /install/)
  assert.match(sql, /enable row level security/)
})

test('paid marketplace acquisition uses the financial ledger and never trusts a browser price', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  const api = read('api/marketplace/purchase.js')
  assert.match(sql, /wrs_acquire_marketplace_item/)
  assert.match(sql, /wrs_wallet_snapshot/)
  assert.match(sql, /wrs_post_ledger_transaction/)
  assert.match(sql, /liability:wallet:/)
  assert.match(sql, /revenue:marketplace:/)
  assert.match(api, /requireSession/)
  assert.doesNotMatch(api, /body\.(?:price|amount|currency)/)
})

test('marketplace install requires entitlement and only approved catalogue capability reaches the robot', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  const api = read('api/marketplace/install.js')
  assert.match(sql, /wrs_install_marketplace_item/)
  assert.match(sql, /marketplace_entitlements/)
  assert.match(sql, /robot_skills/)
  assert.match(sql, /approved/)
  assert.match(api, /requireSession/)
  assert.doesNotMatch(api, /body\.(?:verified|skillSlug|capabilitySlug)/)
})

test('event codes are hashed, expiry-limited and one-user-per-event redeemable', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  assert.match(sql, /event_reward_codes/)
  assert.match(sql, /code_hash/)
  assert.doesNotMatch(sql, /code_plaintext/)
  assert.match(sql, /expires_at/)
  assert.match(sql, /max_redemptions/)
  assert.match(sql, /unique\s*\(event_id,user_id\)|unique\s*\(user_id,event_id\)/)
  assert.match(sql, /wrs_redeem_event_code/)
  assert.match(read('api/rewards/event-code.js'), /requireSession/)
})

test('reward points are append-only, idempotent and not client-awardable', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  assert.match(sql, /reward_point_events/)
  assert.match(sql, /append-only/)
  assert.match(sql, /idempotency_key/)
  assert.match(sql, /wrs_reward_points_balance/)
  const rewards = read('api/rewards.js')
  assert.match(rewards, /requireSession/)
  assert.doesNotMatch(rewards, /body\.(?:points|amount|award)/)
})

test('boost activation atomically spends points and has an explicit expiry/effect projection', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  assert.match(sql, /reward_boost_catalog/)
  assert.match(sql, /reward_boost_activations/)
  assert.match(sql, /wrs_activate_reward_boost/)
  assert.match(sql, /cost_points/)
  assert.match(sql, /expires_at/)
  assert.match(sql, /effect/)
  assert.match(read('api/rewards/boost.js'), /requireSession/)
})

test('academy assessment and certificate issuance are server-authoritative and publicly privacy-safe', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  for (const table of [
    'academy_courses',
    'academy_modules',
    'academy_enrollments',
    'academy_progress',
    'academy_assessments',
    'academy_certificates',
  ]) assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  assert.match(sql, /public_verification_id/)
  assert.match(sql, /wrs_verify_academy_certificate/)
  assert.match(read('api/certificates/verify.js'), /verifyAcademyCertificate/)
  assert.doesNotMatch(read('api/certificates/verify.js'), /owner_user_id|email|phone|wallet/i)
})

test('community attendance is verifiable, leaderboard is opt-in and moderation is internal', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  assert.match(sql, /community_events/)
  assert.match(sql, /community_event_participants/)
  assert.match(sql, /community_leaderboard_profiles/)
  assert.match(sql, /community_moderation_actions/)
  assert.match(sql, /attended/)
  assert.match(sql, /display_alias/)
  assert.match(read('api/community/moderate.js'), /requireInternalBearer/)
})

test('referrals prevent self/duplicate attribution and qualify only after verified paid activation plus review window', () => {
  const sql = read('supabase/migrations/20260822080000_plan8_ecosystem.sql').toLowerCase()
  assert.match(sql, /referral_profiles/)
  assert.match(sql, /referral_relationships/)
  assert.match(sql, /referrer_user_id<>referred_user_id|referrer_user_id <> referred_user_id/)
  assert.match(sql, /unique\s*\(referred_user_id\)/)
  assert.match(sql, /email_verified_at/)
  assert.match(sql, /phone_verified_at/)
  assert.match(sql, /package_entitlements/)
  assert.match(sql, /interval '7 days'/)
  assert.match(sql, /wrs_qualify_referral/)
  assert.match(read('api/referrals/qualify.js'), /requireInternalBearer/)
})

test('production ecosystem screens use the authoritative ecosystem client rather than mock data', () => {
  for (const path of [
    'src/screens/MarketplaceProduction.jsx',
    'src/screens/RewardsProduction.jsx',
    'src/screens/EventCodeProduction.jsx',
    'src/screens/BoostsProduction.jsx',
    'src/screens/AcademyProduction.jsx',
    'src/screens/CommunityProduction.jsx',
    'src/screens/ReferralsProduction.jsx',
  ]) {
    assert.ok(exists(path), `missing ${path}`)
    const source = read(path)
    assert.match(source, /browserEcosystemClient/, path)
    assert.doesNotMatch(source, /\.\.\/data\/mock\.js/, path)
  }
})
