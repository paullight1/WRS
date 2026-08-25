#!/usr/bin/env node
import crypto from 'node:crypto'

const secret = String(process.env.PAYSTACK_TEST_SECRET_KEY || '').trim()
if (!secret) throw new Error('PAYSTACK_TEST_SECRET_KEY is required')
if (!secret.startsWith('sk_test_')) throw new Error('Plan 11 payout probe refuses non-test keys')

const apiOrigin = 'https://api.paystack.co'
const accountNumber = String(process.env.WRS_PAYSTACK_TEST_ACCOUNT || '0000000000').trim()
const bankCode = String(process.env.WRS_PAYSTACK_TEST_BANK_CODE || '057').trim()
const amountMinor = Number(process.env.WRS_PAYSTACK_TEST_PAYOUT_AMOUNT_MINOR || 10_000)
const currency = 'NGN'

if (!/^\d{10}$/.test(accountNumber)) {
  throw new Error('WRS_PAYSTACK_TEST_ACCOUNT must be a 10-digit test account')
}
if (!/^\d{3,6}$/.test(bankCode)) throw new Error('WRS_PAYSTACK_TEST_BANK_CODE is invalid')
if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 100_000) {
  throw new Error('WRS_PAYSTACK_TEST_PAYOUT_AMOUNT_MINOR must be an integer between 100 and 100000')
}

async function providerRequest(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Paystack payout probe timed out')), 15_000)
  try {
    const response = await fetch(`${apiOrigin}${path}`, {
      method: options.method || 'GET',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${secret}`,
        accept: 'application/json',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.status || !payload?.data) {
      throw new Error(`Paystack payout test-mode request failed for ${path} with HTTP ${response.status}`)
    }
    return payload.data
  } finally {
    clearTimeout(timer)
  }
}

const checkedAt = new Date().toISOString()
const reference = `wrs-p11-payout-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

const recipient = await providerRequest('/transferrecipient', {
  method: 'POST',
  body: {
    type: 'nuban',
    name: 'WRS Plan 11 Synthetic Recipient',
    account_number: accountNumber,
    bank_code: bankCode,
    currency,
    description: 'Synthetic Plan 11 payout verification only',
    metadata: { probe: 'wrs-plan11-payout', synthetic: true },
  },
})

if (!recipient.recipient_code) throw new Error('Paystack did not return a transfer recipient code')
if (recipient.domain && recipient.domain !== 'test') {
  throw new Error('Paystack transfer recipient was not created in test mode')
}

const transfer = await providerRequest('/transfer', {
  method: 'POST',
  body: {
    source: 'balance',
    amount: amountMinor,
    recipient: recipient.recipient_code,
    reference,
    reason: 'WRS Plan 11 synthetic payout verification',
    currency,
  },
})

if (transfer.domain && transfer.domain !== 'test') throw new Error('Paystack transfer was not created in test mode')
if (String(transfer.reference || '') !== reference) throw new Error('Paystack transfer reference mismatch')

const verified = await providerRequest(`/transfer/verify/${encodeURIComponent(reference)}`)
if (verified.domain && verified.domain !== 'test') {
  throw new Error('Paystack verified transfer was not in test mode')
}
if (String(verified.reference || '') !== reference) throw new Error('Paystack verified transfer reference mismatch')
if (Number(verified.amount) !== amountMinor) throw new Error('Paystack verified transfer amount mismatch')
if (String(verified.currency || '').toUpperCase() !== currency) {
  throw new Error('Paystack verified transfer currency mismatch')
}

const evidence = {
  gate: 'payout-sandbox',
  provider: 'paystack',
  mode: 'test',
  status: 'PROBE_PASS',
  checkedAt,
  reference,
  recipientCode: recipient.recipient_code,
  transferCode: transfer.transfer_code || null,
  transferStatus: transfer.status || null,
  verifiedStatus: verified.status || null,
  amountMinor,
  currency,
  note: 'Synthetic test-mode recipient/transfer/verification only; KYC-gated WRS withdrawal, webhook/reversal and ledger reconciliation evidence is still required for PASS.',
}

process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`)
