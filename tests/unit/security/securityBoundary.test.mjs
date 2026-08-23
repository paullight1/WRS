import { describe, expect, it } from 'vitest'
import { redactTelemetry, requestId, validateJsonEnvelope } from '../../../api/_lib/security.js'

describe('shared API security boundary', () => {
  it('redacts identity, financial and biometric fields before telemetry', () => {
    expect(
      redactTelemetry({
        email: 'person@example.com',
        token: 'secret',
        amountMinor: 5000,
        nested: { voiceSample: 'raw-audio', safe: 'ok' },
      }),
    ).toEqual({
      email: '[REDACTED]',
      token: '[REDACTED]',
      amountMinor: '[REDACTED]',
      nested: { voiceSample: '[REDACTED]', safe: 'ok' },
    })
  })

  it('scrubs identity and bearer credentials embedded in free-text errors', () => {
    const sanitized = redactTelemetry(
      new Error('Provider failed for person@example.com using Bearer extremely-sensitive-token and +2348000000000'),
    )
    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toContain('person@example.com')
    expect(serialized).not.toContain('extremely-sensitive-token')
    expect(serialized).not.toContain('+2348000000000')
    expect(serialized).toContain('[REDACTED')
  })

  it('accepts a safe caller request id and replaces malformed identifiers', () => {
    const accepted = new Request('https://wrs.example/api/test', { headers: { 'x-request-id': 'req-12345678' } })
    const rejected = new Request('https://wrs.example/api/test', { headers: { 'x-request-id': '<script>' } })
    expect(requestId(accepted)).toBe('req-12345678')
    expect(requestId(rejected)).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('rejects non-JSON mutation content and oversized declared bodies', () => {
    const wrongType = new Request('https://wrs.example/api/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    })
    expect(validateJsonEnvelope(wrongType, 100).status).toBe(415)

    const oversized = new Request('https://wrs.example/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '101' },
      body: '{}',
    })
    expect(validateJsonEnvelope(oversized, 100).status).toBe(413)
  })
})
