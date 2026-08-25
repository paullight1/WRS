import { appendCookies, functionHandler, json, requireMethod } from '../server/http.js'
import { walletSnapshot } from '../server/finance.js'
import { requireSession } from '../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const currency = String(new URL(request.url).searchParams.get('currency') || 'USD').toUpperCase()
  // walletSnapshot delegates to the service-role wrs_wallet_snapshot ledger projection.
  const snapshot = await walletSnapshot(resolved.user.id, currency)
  return appendCookies(json({ wallet: snapshot }), resolved.cookies)
})
