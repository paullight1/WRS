import crypto from 'node:crypto'

const key = String(process.env.PAYSTACK_TEST_SECRET_KEY || '').trim()
const stagingUrl = String(process.env.WRS_STAGING_URL || '').trim().replace(/\/$/, '')
const email = String(process.env.WRS_SANDBOX_EMAIL || '').trim()
const verifyReference = String(process.env.PAYSTACK_TEST_REFERENCE || '').trim()
const baseUrl = String(process.env.PAYSTACK_TEST_BASE_URL || 'https://api.paystack.co').trim().replace(/\/$/, '')

const errors = []
if (!key) errors.push('PAYSTACK_TEST_SECRET_KEY is missing')
else if (!key.startsWith('sk_test_')) errors.push('PAYSTACK_TEST_SECRET_KEY must be a Paystack test key')
if (!/^https:\/\//i.test(stagingUrl)) errors.push('WRS_STAGING_URL must be an HTTPS URL')
if (!email || !email.includes('@')) errors.push('WRS_SANDBOX_EMAIL must be a valid sandbox email address')
if (!/^https:\/\//i.test(baseUrl)) errors.push('PAYSTACK_TEST_BASE_URL must use HTTPS')

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(12_000),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.status) {
    throw new Error(`Paystack sandbox request failed with HTTP ${response.status}`)
  }
  return data.data
}

async function main() {
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  const reference = `wrs-sandbox-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const initialized = await request('/transaction/initialize', {
    method: 'POST',
    body: {
      email,
      amount: '10000',
      currency: 'NGN',
      reference,
      callback_url: `${stagingUrl}/packages/sandbox/success`,
      metadata: {
        environment: 'staging',
        purpose: 'wrs-live-activation-smoke',
      },
    },
  })

  if (!initialized?.authorization_url || !initialized?.access_code || initialized?.reference !== reference) {
    throw new Error('Paystack sandbox did not return a valid transaction initialization response')
  }

  console.log(`Paystack sandbox initialization PASS reference=${reference}`)
  console.log(`Authorization URL: ${initialized.authorization_url}`)

  if (verifyReference) {
    const verified = await request(`/transaction/verify/${encodeURIComponent(verifyReference)}`)
    console.log(
      `Paystack sandbox verification reference=${verified?.reference || verifyReference} status=${verified?.status || 'unknown'} amountMinor=${Number(verified?.amount || 0)} currency=${String(verified?.currency || '').toUpperCase()}`,
    )
  } else {
    console.log('No PAYSTACK_TEST_REFERENCE supplied; completed provider-connectivity/initialization smoke only.')
  }
}

main().catch((error) => {
  console.error(`Paystack sandbox smoke FAILED: ${error instanceof Error ? error.message : 'unknown error'}`)
  process.exitCode = 1
})
