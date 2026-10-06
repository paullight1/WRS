import { describe, expect, it } from 'vitest'
import { apiUrl } from '../../../src/infrastructure/http/apiUrl'

describe('apiUrl', () => {
  it('keeps relative requests relative when the API origin is empty', () => {
    expect(apiUrl('/api/auth/session', '')).toBe('/api/auth/session')
  })

  it('resolves a request against an absolute HTTP API origin', () => {
    expect(apiUrl('/api/auth/session', 'https://api.example.test')).toBe('https://api.example.test/api/auth/session')
  })

  it('joins origin and path without duplicate slashes', () => {
    expect(apiUrl('/api/auth/session', 'https://api.example.test/')).toBe('https://api.example.test/api/auth/session')
  })

  it.each(['not-an-origin', 'ftp://api.example.test', 'https://api.example.test/base'])('rejects invalid API origin %s', (origin) => {
    expect(() => apiUrl('/api/auth/session', origin)).toThrow(/HTTP origin/)
  })
})
