import crypto from 'node:crypto'
import { HttpError } from './http.js'

const DEFAULT_BASE_URL = 'https://api.paystack.co'

function config() {
  const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '')
  if (!secretKey) throw new HttpError(503, 'Payment provider is not configured.', 'payments-unavailable')
  const baseUrl = String(process.env.PAYSTACK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  if (!baseUrl.startsWith('https://')) throw new HttpError(500, 'Payment provider URL must use HTTPS.', 'provider-config')
  return { secretKey, baseUrl }
}

async function paystackRequest(path, options = {}) {
  const cfg = config()
  let response
  try {
    response = await fetch(`${cfg.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        authorization: `Bearer ${cfg.secretKey}`,
        accept: 'application/json',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    console.error('Paystack transport error', error)
    throw new HttpError(502, 'Payment provider is unreachable.', 'provider-unreachable')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.status) {
    throw new HttpError(response.status >= 500 ? 502 : 400, 'Payment provider rejected the request.', 'provider-error')
  }
  return data.data
}

export async function initializeTransaction(input) {
  const data = await paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: {
      email: input.email,
      amount: String(input.amountMinor),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    },
  })
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  }
}

export async function verifyTransaction(reference) {
  const data = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`)
  return {
    reference: data.reference,
    amountMinor: Number(data.amount),
    currency: String(data.currency || '').toUpperCase(),
    status: data.status,
    paidAt: data.paid_at || data.paidAt || null,
    raw: data,
  }
}

export async function createTransferRecipient(input) {
  const data = await paystackRequest('/transferrecipient', {
    method: 'POST',
    body: {
      type: 'nuban',
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency,
    },
  })
  return { recipientCode: data.recipient_code, raw: data }
}

export async function initiateTransfer(input) {
  const data = await paystackRequest('/transfer', {
    method: 'POST',
    body: {
      source: 'balance',
      amount: input.amountMinor,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
      currency: input.currency,
    },
  })
  return { reference: data.reference || input.reference, status: data.status || 'pending', raw: data }
}

export async function verifyTransfer(reference) {
  const data = await paystackRequest(`/transfer/verify/${encodeURIComponent(reference)}`)
  return {
    reference: data.reference,
    amountMinor: Number(data.amount),
    currency: String(data.currency || '').toUpperCase(),
    status: data.status,
    raw: data,
  }
}

export function verifyPaystackWebhook(rawBody, signature) {
  const { secretKey } = config()
  const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex')
  const actual = String(signature || '').trim().toLowerCase()
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'))
}

export function paystackEventFingerprint(rawBody) {
  return crypto.createHash('sha256').update(rawBody).digest('hex')
}
