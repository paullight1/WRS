const env = process.env

const clientFlags = [
  'VITE_WRS_PAYMENT_SERVICE',
  'VITE_WRS_IDENTITY_SERVICE',
  'VITE_WRS_ROBOT_SERVICE',
  'VITE_WRS_DATA_SERVICE',
  'VITE_WRS_REWARD_SERVICE',
  'VITE_WRS_DEPLOYMENT_SERVICE',
  'VITE_WRS_SUPPORT_SERVICE',
]

const requiredSecrets = [
  'WRS_DATA_SCANNER_SECRET',
  'WRS_DATA_REVIEW_SECRET',
  'WRS_DATA_DELETION_SECRET',
  'WRS_DEPLOYMENT_OPERATIONS_SECRET',
  'WRS_ECOSYSTEM_OPERATOR_TOKEN',
  'WRS_ACADEMY_ASSESSOR_TOKEN',
  'WRS_COMMUNITY_OPERATOR_TOKEN',
  'WRS_REFERRAL_QUALIFIER_TOKEN',
  'WRS_ACCOUNT_DELETION_WORKER_TOKEN',
]

const problems = []
const value = (key) => String(env[key] || '').trim()
const enabled = (key) => ['1', 'true', 'enabled', 'on'].includes(value(key).toLowerCase())
const placeholder = (input) => /example|placeholder|replace-with|your-wrs|localhost|127\.0\.0\.1|\.invalid/i.test(input)

function requireValue(key) {
  const current = value(key)
  if (!current) problems.push(`${key} is missing`)
  else if (placeholder(current)) problems.push(`${key} is still a placeholder`)
  return current
}

function requireHttps(key) {
  const current = requireValue(key)
  if (current && !/^https:\/\//i.test(current)) problems.push(`${key} must use HTTPS`)
  return current
}

const mode = value('VITE_WRS_MODE').toLowerCase()
if (!['staging', 'production'].includes(mode)) {
  problems.push('VITE_WRS_MODE must be staging or production')
}

requireHttps('VITE_WRS_AUTHORITY_URL')
for (const key of clientFlags) {
  if (!enabled(key)) problems.push(`${key} must be enabled`)
}

const supabaseUrl = requireHttps('SUPABASE_URL')
if (supabaseUrl && !/supabase/i.test(supabaseUrl)) {
  problems.push('SUPABASE_URL must point to the dedicated Supabase authority')
}
requireValue('SUPABASE_PUBLISHABLE_KEY')
requireValue('SUPABASE_SECRET_KEY')

const paystackKey = requireValue('PAYSTACK_SECRET_KEY')
if (mode === 'staging' && paystackKey && !paystackKey.startsWith('sk_test_')) {
  problems.push('staging PAYSTACK_SECRET_KEY must be a Paystack test key')
}
if (mode === 'production' && paystackKey && !paystackKey.startsWith('sk_live_')) {
  problems.push('production PAYSTACK_SECRET_KEY must be a Paystack live key')
}

const bucket = requireValue('WRS_DATA_BUCKET')
if (bucket && !/^[a-zA-Z0-9._-]{3,63}$/.test(bucket)) {
  problems.push('WRS_DATA_BUCKET is invalid')
}

for (const key of requiredSecrets) {
  const current = requireValue(key)
  if (current && current.length < 32) problems.push(`${key} must be at least 32 characters`)
}

if (problems.length) {
  console.error('WRS live environment preflight FAILED:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exitCode = 1
} else {
  console.log(`WRS live environment preflight PASS (${mode}).`)
}
