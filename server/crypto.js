import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http.js'

export function base64url(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value))
  return bytes.toString('base64url')
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('base64url')
}

export function hmac(value, secret) {
  if (!secret) throw new HttpError(503, 'Server signing configuration is unavailable.', 'signing-unavailable')
  return createHmac('sha256', secret).update(String(value)).digest('base64url')
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function signedToken(payload, secret) {
  const encoded = base64url(JSON.stringify(payload))
  return `${encoded}.${hmac(encoded, secret)}`
}

export function verifySignedToken(token, secret) {
  const [encoded, signature, extra] = String(token || '').split('.')
  if (!encoded || !signature || extra) throw new HttpError(400, 'Signed token is invalid.', 'invalid-token')
  const expected = hmac(encoded, secret)
  if (!safeEqual(signature, expected)) throw new HttpError(400, 'Signed token is invalid.', 'invalid-token')
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    throw new HttpError(400, 'Signed token is invalid.', 'invalid-token')
  }
}
