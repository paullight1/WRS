import { beginOAuth } from '../../_lib/oauth.js'
import { appendCookies, assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../../_lib/http.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const result = await beginOAuth(request, body.provider)
  return appendCookies(json({ authorizationUrl: result.authorizationUrl }), [result.cookie])
})
