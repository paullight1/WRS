import { clearOAuthCookie, completeOAuth } from '../../../server/oauth.js'
import { appendCookies, redirect } from '../../../server/http.js'

export default {
  async fetch(request) {
    const origin = new URL(request.url).origin
    try {
      const result = await completeOAuth(request)
      return appendCookies(redirect(`${origin}/home`), result.cookies)
    } catch (error) {
      console.error('OAuth callback rejected', error)
      const reason = encodeURIComponent(error?.code || 'oauth-failed')
      return appendCookies(redirect(`${origin}/login?error=${reason}`), [clearOAuthCookie()])
    }
  },
}
