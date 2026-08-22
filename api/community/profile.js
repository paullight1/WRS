import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { setCommunityLeaderboard } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const optedIn = Boolean(body.optedIn)
  const displayAlias = String(body.displayAlias || '').trim()
  if (optedIn && (displayAlias.length < 2 || displayAlias.length > 40)) {
    throw new HttpError(400, 'Leaderboard alias must be 2–40 characters.', 'invalid-alias')
  }
  const result = await setCommunityLeaderboard(resolved.user.id, optedIn, displayAlias || 'Private member')
  return appendCookies(json(result), resolved.cookies)
})
