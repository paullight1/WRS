import { clearOAuthCookie, completeOAuth, oauthErrorTarget } from '../../../oauth.js'
import { appendCookies, redirect } from '../../../http.js'

export default {
  async fetch(request) {
    const origin = new URL(request.url).origin
    try {
      const result = await completeOAuth(request)
      return appendCookies(redirect(result.redirectTo || `${origin}/home`), result.cookies)
    } catch (error) {
      console.error('OAuth callback rejected', error)
      const target = new URL(oauthErrorTarget(request))
      target.searchParams.set('error', error?.code || 'oauth-failed')
      return appendCookies(redirect(target.toString()), [clearOAuthCookie()])
    }
  },
}
