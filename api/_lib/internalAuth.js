import crypto from 'node:crypto'
import { HttpError } from './http.js'

export function requireInternalBearer(request, envName, unavailableMessage = 'Internal integration is not configured.') {
  const expected = String(process.env[envName] || '')
  if (!expected) throw new HttpError(503, unavailableMessage, 'integration-unavailable')
  const header = request.headers.get('authorization') || ''
  const actual = header.startsWith('Bearer ') ? header.slice(7) : ''
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  const valid = left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
  if (!valid) throw new HttpError(401, 'Unauthorized internal request.', 'unauthorized')
}
