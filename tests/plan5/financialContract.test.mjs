import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const required = [
  'src/domain/finance/ledger.ts',
  'src/domain/finance/payments.ts',
  'src/services/finance/FinanceService.ts',
  'api/_lib/paystack.js',
  'api/_lib/finance.js',
  'api/payments/initialize.js',
  'api/payments/verify.js',
  'api/payments/webhook.js',
  'api/wallet.js',
  'api/wallet/payout-method.js',
  'api/wallet/withdraw.js',
  'api/payments/reconcile.js',
  'supabase/migrations/20260822050000_plan5_financial_ledger.sql',
  'supabase/migrations/20260822051000_plan5_finance_reversals.sql',
  'supabase/migrations/20260822052000_plan5_idempotency_isolation.sql',
]

test('Plan 5 has authoritative finance domain, server and database boundaries', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('ledger schema is double-entry, append-only and uses integer minor units', () => {
  const sql = read('supabase/migrations/20260822050000_plan5_financial_ledger.sql').toLowerCase()
  for (const table of [
    'ledger_accounts',
    'ledger_transactions',
    'ledger_entries',
    'payment_intents',
    'financial_provider_events',
    'payout_methods',
    'withdrawals',
    'financial_reconciliations',
  ]) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`), table)
  }
  assert.match(sql, /amount_minor bigint/)
  assert.match(sql, /ledger_entries_append_only/)
  assert.match(sql, /wrs_post_ledger_transaction/)
  assert.match(sql, /debit.*credit|credit.*debit/s)
  assert.match(sql, /idempotency_key/)
})

test('payments use server-side provider initialization and verified settlement', () => {
  const provider = read('api/_lib/paystack.js')
  const webhook = read('api/payments/webhook.js')
  assert.match(provider, /transaction\/initialize/)
  assert.match(provider, /transaction\/verify/)
  assert.match(provider, /sha512/i)
  assert.doesNotMatch(provider, /VITE_.*SECRET|localStorage/)
  assert.match(webhook, /x-paystack-signature/i)
  assert.match(webhook, /verifyPaystackWebhook/)
  assert.match(webhook, /wrs_settle_payment/)

  const initialize = read('api/payments/initialize.js')
  const verify = read('api/payments/verify.js')
  assert.match(initialize, /requireSession/)
  assert.match(initialize, /assertSameOrigin/)
  assert.match(initialize, /wrs_create_payment_intent/)
  assert.match(verify, /wrs_settle_payment/)
})

test('provider events, payment fulfillment and withdrawals are idempotent and request-isolated', () => {
  const sql = read('supabase/migrations/20260822050000_plan5_financial_ledger.sql').toLowerCase()
  const isolation = read('supabase/migrations/20260822052000_plan5_idempotency_isolation.sql').toLowerCase()
  assert.match(sql, /unique.*idempotency_key|idempotency_key.*unique/s)
  assert.match(sql, /unique.*provider.*provider_reference|unique\s*\(provider, provider_reference\)/s)
  assert.match(sql, /wrs_reserve_withdrawal/)
  assert.match(sql, /for update/)
  assert.match(sql, /wrs_fail_withdrawal/)
  assert.match(isolation, /payment idempotency key collision/)
  assert.match(isolation, /withdrawal idempotency key collision/)
  assert.match(isolation, /user_id <> p_user_id|user_id <> p_user_id/s)
})

test('package entitlement activation can only follow posted verified payment', () => {
  const sql = read('supabase/migrations/20260822050000_plan5_financial_ledger.sql').toLowerCase()
  assert.match(sql, /package_entitlements/)
  assert.match(sql, /wrs_settle_payment/)
  assert.match(sql, /status = 'posted'|status,'posted'|posted_at/s)
  assert.match(sql, /amount_minor/)
  assert.match(sql, /currency/)
})

test('wallet balance is derived from ledger entries rather than mutable balance fields', () => {
  const finance = read('api/_lib/finance.js')
  const wallet = read('api/wallet.js')
  const sql = read('supabase/migrations/20260822050000_plan5_financial_ledger.sql').toLowerCase()
  assert.match(finance, /wrs_wallet_snapshot/)
  assert.match(wallet, /wrs_wallet_snapshot/)
  assert.match(sql, /from public\.ledger_entries/)
  assert.doesNotMatch(wallet, /balance\s*=|setBalance|localStorage/)
})

test('withdrawals require verified payout method, KYC and provider transfer verification', () => {
  const endpoint = read('api/wallet/withdraw.js')
  const provider = read('api/_lib/paystack.js')
  assert.match(endpoint, /requireSession/)
  assert.match(endpoint, /kyc/i)
  assert.match(endpoint, /wrs_reserve_withdrawal/)
  assert.match(endpoint, /wrs_fail_withdrawal|wrs_mark_withdrawal_provider_pending/)
  assert.match(provider, /transferrecipient/)
  assert.match(provider, /transfer\/verify/)
  assert.match(provider, /\/transfer/)
})

test('refunds and transfer reversals use compensating ledger transactions', () => {
  const sql = read('supabase/migrations/20260822051000_plan5_finance_reversals.sql').toLowerCase()
  const webhook = read('api/payments/webhook.js')
  assert.match(sql, /wrs_process_payment_refund/)
  assert.match(sql, /wrs_reverse_withdrawal/)
  assert.match(sql, /package-payment-refund/)
  assert.match(sql, /withdrawal-reversed/)
  assert.match(sql, /fullyrefunded|fullyrefunded/i)
  assert.match(webhook, /refund\.processed/)
  assert.match(webhook, /transfer\.reversed/)
  assert.match(webhook, /processPaymentRefund/)
  assert.match(webhook, /reverseWithdrawal/)
})

test('reconciliation exists and does not trust callbacks alone', () => {
  const source = read('api/payments/reconcile.js')
  assert.match(source, /CRON_SECRET/)
  assert.match(source, /verifyTransaction|verifyTransfer/)
  assert.match(source, /processPaymentRefund/)
  assert.match(source, /reverseWithdrawal/)
  assert.match(source, /reconcil/i)
})
