import { clearOAuthCookie, completeOAuth, oauthErrorTarget } from '../../../oauth.js'
import { appendCookies, redirect } from '../../../http.js'
import { corsResponse, preflightResponse } from '../../../../api/_lib/origins.js'

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return corsResponse(request, preflightResponse(request))
    try {
      const result = await completeOAuth(request)
      return corsResponse(request, appendCookies(redirect(result.redirectTo), result.cookies))
    } catch (error) {
      console.error('OAuth callback rejected', error)
      const reason = encodeURIComponent(error?.code || 'oauth-failed')
      const target = new URL(oauthErrorTarget(request))
      target.searchParams.set('error', reason)
      return corsResponse(request, appendCookies(redirect(target.toString()), [clearOAuthCookie()]))
    }
  },
}
