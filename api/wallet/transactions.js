import { appendCookies, functionHandler, json, requireMethod } from '../../server/http.js'
import { requireSession } from '../../server/session.js'
import { serviceRest } from '../../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const currency = String(new URL(request.url).searchParams.get('currency') || 'USD').toUpperCase()
  const code = `liability:wallet:${resolved.user.id}:${currency}`
  const { data: accounts } = await serviceRest(
    `/rest/v1/ledger_accounts?code=eq.${encodeURIComponent(code)}&owner_user_id=eq.${encodeURIComponent(resolved.user.id)}&select=id&limit=1`,
  )
  const account = Array.isArray(accounts) ? accounts[0] || null : null
  if (!account) return appendCookies(json({ transactions: [] }), resolved.cookies)

  const { data } = await serviceRest(
    `/rest/v1/ledger_entries?account_id=eq.${encodeURIComponent(account.id)}&select=id,direction,amount_minor,currency,created_at,ledger_transactions!inner(id,kind,status,reference,provider_reference,created_at)&order=created_at.desc&limit=100`,
  )
  const transactions = (Array.isArray(data) ? data : []).map((entry) => ({
    id: entry.ledger_transactions?.id || String(entry.id),
    kind: entry.ledger_transactions?.kind || 'ledger-entry',
    status: entry.ledger_transactions?.status || 'posted',
    reference: entry.ledger_transactions?.reference || '',
    providerReference: entry.ledger_transactions?.provider_reference || null,
    direction: entry.direction,
    amountMinor: Number(entry.amount_minor),
    currency: entry.currency,
    createdAt: entry.created_at,
  }))
  return appendCookies(json({ transactions }), resolved.cookies)
})
