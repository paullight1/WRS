#!/usr/bin/env node
import crypto from 'node:crypto'

const secret = String(process.env.PAYSTACK_TEST_SECRET_KEY || '').trim()
if (!secret) throw new Error('PAYSTACK_TEST_SECRET_KEY is required')
if (!secret.startsWith('sk_test_')) throw new Error('Plan 11 Paystack probe refuses non-test keys')

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(new Error('Paystack sandbox probe timed out')), 15_000)
const checkedAt = new Date().toISOString()
const reference = `wrs-p11-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

try {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      authorization: `Bearer ${secret}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: 'wrs-plan11@example.com',
      amount: '10000',
      currency: 'NGN',
      reference,
      metadata: { probe: 'wrs-plan11-live-activation', synthetic: true },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status || !payload?.data?.reference) {
    throw new Error(`Paystack test-mode initialization failed with HTTP ${response.status}`)
  }

  const authorizationHost = new URL(payload.data.authorization_url).host
  const evidence = {
    gate: 'payment-sandbox',
    provider: 'paystack',
    mode: 'test',
    status: 'PROBE_PASS',
    checkedAt,
    reference: payload.data.reference,
    accessCodePresent: Boolean(payload.data.access_code),
    authorizationHost,
    note: 'Initialization probe only; webhook, settlement, refund and reconciliation evidence is still required for PASS.',
  }
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`)
} finally {
  clearTimeout(timeout)
}
