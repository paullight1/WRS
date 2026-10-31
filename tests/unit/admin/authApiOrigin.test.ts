import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserAuthClient } from '../../../src/infrastructure/auth/browserAuthClient'

vi.mock('../../../src/infrastructure/http/apiUrl', () => ({
  apiUrl: (path: string) => new URL(path, 'https://www.worldroboticsystem.com').toString(),
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('admin authentication API origin', () => {
  it('uses the configured API origin for sessions and sign-in while sending cookies', async () => {
    vi.stubEnv('VITE_WRS_API_ORIGIN', 'https://www.worldroboticsystem.com')
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session: null }) })
    vi.stubGlobal('fetch', fetch)
    await browserAuthClient.session()
    await browserAuthClient.login('admin@example.com', 'test-password', false)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.worldroboticsystem.com/api/auth/session',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://www.worldroboticsystem.com/api/auth/login',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
  })

  it('preserves the admin return URL when starting OAuth', async () => {
    vi.stubEnv('VITE_WRS_API_ORIGIN', 'https://www.worldroboticsystem.com')
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ authorizationUrl: 'https://example.com' }) })
    vi.stubGlobal('fetch', fetch)
    await browserAuthClient.beginOAuth('google', 'https://admin.worldroboticsystem.com/auth/callback')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      provider: 'google',
      returnTo: 'https://admin.worldroboticsystem.com/auth/callback',
    })
  })
})
