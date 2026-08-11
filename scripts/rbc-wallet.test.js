import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildConversionQuoteSnapshot,
  createMiningApi,
  isUnavailableConversionRate,
  maskBankAccount,
  validateWithdrawalRequest,
  walletTabs,
  withdrawalPayload,
  withdrawalStatusPresentation,
} from '../src/lib/miningApi.js'

test('keeps the server-returned conversion-rate snapshot in the quote display', () => {
  const snapshot = buildConversionQuoteSnapshot({
    amountRbcCents: 12500,
    destinationAmountMinor: 187500,
    feeRbcCents: 2500,
    currency: 'NGN',
    rate: { version: 7 },
    expiresAt: '2026-08-11T12:05:00.000Z',
  })

  assert.deepEqual(snapshot, {
    source: '125.00 RBC',
    destination: 'NGN 1,875.00',
    fee: '25.00 RBC',
    rateVersion: 7,
    expiresAt: '2026-08-11T12:05:00.000Z',
  })
})

test('rejects withdrawal amounts outside the available RBC balance', () => {
  const base = {
    quoteId: 'quote-12345678', bankCountry: 'NG', bankName: 'WRS Bank', accountName: 'Paul Light',
    accountNumber: '0123456789', currency: 'NGN', confirmed: true,
  }

  assert.equal(validateWithdrawalRequest({ ...base, amount: '0' }, { availableRbcCents: 5000 }).amount, 'Enter an amount greater than 0 RBC.')
  assert.equal(validateWithdrawalRequest({ ...base, amount: '0.50' }, { availableRbcCents: 5000 }).amount, 'Enter at least 1.00 RBC.')
  assert.equal(validateWithdrawalRequest({ ...base, amount: '50.01' }, { availableRbcCents: 5000 }).amount, 'Amount exceeds your available 50.00 RBC balance.')
  assert.deepEqual(validateWithdrawalRequest({ ...base, amount: '50' }, { availableRbcCents: 5000 }), {})
})

test('requires bank details and an explicit withdrawal confirmation', () => {
  const errors = validateWithdrawalRequest({ amount: '25', quoteId: 'quote-12345678', currency: 'NGN', confirmed: false }, { availableRbcCents: 5000 })

  assert.deepEqual(errors, {
    bankCountry: 'Choose the bank country.',
    bankName: 'Enter the bank name.',
    accountName: 'Enter the account holder name.',
    accountNumber: 'Enter the account number or IBAN.',
    confirmed: 'Confirm that these bank details are correct.',
  })
})

test('binds a withdrawal submission to the current server-created quote', () => {
  assert.deepEqual(
    withdrawalPayload({
      bankCountry: 'ng', bankName: 'WRS Bank', accountName: 'Paul Light', accountNumber: '01 234 567 89', confirmed: true,
    }, { id: 'quote-12345678', amountRbcCents: 2500, currency: 'NGN' }),
    {
      quoteId: 'quote-12345678', amountRbcCents: 2500, currency: 'NGN',
      bankCountry: 'NG', bankName: 'WRS Bank', accountName: 'Paul Light', accountNumber: '0123456789', confirmed: true,
    },
  )
})

test('masks returned bank account values without exposing their full number', () => {
  assert.equal(maskBankAccount('0123456789'), '•••• 6789')
  assert.equal(maskBankAccount('GB29NWBK60161331926819'), '•••• 6819')
  assert.equal(maskBankAccount('123'), '••••')
})

test('uses truthful copy for every server-owned withdrawal state', () => {
  assert.deepEqual(withdrawalStatusPresentation('pending'), { label: 'Pending review', tone: 'gold', detail: 'Request submitted. No bank payout has been made.' })
  assert.deepEqual(withdrawalStatusPresentation('approved'), { label: 'Approved', tone: 'tertiary', detail: 'Approved for manual bank payout. Payment is not yet complete.' })
  assert.deepEqual(withdrawalStatusPresentation('paid'), { label: 'Paid', tone: 'success', detail: 'An administrator recorded the completed bank payout.' })
  assert.deepEqual(withdrawalStatusPresentation('rejected'), { label: 'Rejected', tone: 'error', detail: 'This request was not approved. Review the reason before submitting another request.' })
})

test('exposes only conversion, withdrawal, and history wallet destinations', () => {
  assert.deepEqual(walletTabs(), ['Overview', 'Withdrawals', 'History'])
})

test('keeps wallet balances available when an administrator has not published a conversion rate', () => {
  assert.equal(isUnavailableConversionRate({ status: 404 }), true)
  assert.equal(isUnavailableConversionRate({ status: 500 }), false)
})

test('uses the dedicated RBC API contract for wallet data and mutations', async () => {
  const calls = []
  const api = createMiningApi({
    get: async (path) => { calls.push({ method: 'GET', path }); return { ok: true } },
    post: async (path, body, options) => { calls.push({ method: 'POST', path, body, options }); return { ok: true } },
  })

  await api.getWallet()
  await api.getConversionRate()
  await api.createConversionQuote({ amountRbcCents: 2500, currency: 'NGN' }, 'quote-key')
  await api.createWithdrawal({ quoteId: 'quote-12345678', amountRbcCents: 2500, currency: 'NGN' }, 'withdrawal-key')
  await api.getWithdrawals()
  await api.getTransactions()

  assert.deepEqual(calls, [
    { method: 'GET', path: '/rbc/wallet' },
    { method: 'GET', path: '/rbc/conversion-rate' },
    { method: 'POST', path: '/rbc/conversion-quotes', body: { amountRbcCents: 2500, currency: 'NGN' }, options: { idempotencyKey: 'quote-key' } },
    { method: 'POST', path: '/rbc/withdrawals', body: { quoteId: 'quote-12345678', amountRbcCents: 2500, currency: 'NGN' }, options: { idempotencyKey: 'withdrawal-key' } },
    { method: 'GET', path: '/rbc/withdrawals' },
    { method: 'GET', path: '/rbc/transactions' },
  ])
})
