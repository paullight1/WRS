import { beforeEach, describe, expect, it, vi } from 'vitest'

const oauth = vi.hoisted(() => ({
  beginOAuth: vi.fn(),
  completeOAuth: vi.fn(),
  clearOAuthCookie: vi.fn(() => 'wrs_oauth=; Path=/'),
  oauthErrorTarget: vi.fn(),
}))
vi.mock('../../../server/oauth.js', () => oauth)
const { default: start } = await import('../../../server/routes/auth/oauth/start.js')
const { default: callback } = await import('../../../server/routes/auth/oauth/callback.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin OAuth routes', () => {
  it('passes the admin callback to the signed OAuth state', async () => {
    oauth.beginOAuth.mockResolvedValue({ authorizationUrl: 'https://provider.example', cookie: 'state=1; Path=/' })
    const request = new Request('https://www.worldroboticsystem.com/api/auth/oauth/start', {
      method: 'POST',
      headers: { origin: 'https://www.worldroboticsystem.com', 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'google', returnTo: 'https://admin.worldroboticsystem.com/auth/callback' }),
    })
    const response = await start.fetch(request)
    expect(response.status).toBe(200)
    expect(oauth.beginOAuth).toHaveBeenCalledWith(
      request,
      'google',
      'https://admin.worldroboticsystem.com/auth/callback',
    )
  })

  it('returns a completed sign-in to the validated admin callback', async () => {
    oauth.completeOAuth.mockResolvedValue({
      redirectTo: 'https://admin.worldroboticsystem.com/auth/callback',
      cookies: [],
    })
    const response = await callback.fetch(
      new Request('https://www.worldroboticsystem.com/api/auth/oauth/callback?code=abc'),
    )
    expect(response.headers.get('location')).toBe('https://admin.worldroboticsystem.com/auth/callback')
  })

  it('returns an OAuth error to the validated callback without losing its existing query', async () => {
    oauth.completeOAuth.mockRejectedValue(Object.assign(new Error('failed'), { code: 'oauth-invalid' }))
    oauth.oauthErrorTarget.mockReturnValue('https://admin.worldroboticsystem.com/auth/callback?source=admin')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await callback.fetch(
      new Request('https://www.worldroboticsystem.com/api/auth/oauth/callback?error=denied'),
    )
    expect(response.headers.get('location')).toBe(
      'https://admin.worldroboticsystem.com/auth/callback?source=admin&error=oauth-invalid',
    )
  })
})
