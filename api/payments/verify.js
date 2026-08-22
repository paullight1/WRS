import crypto from 'node:crypto'
import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { settlePayment } from '../../server/finance.js'
import { verifyTransaction } from '../../server/paystack.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, ['GET', 'POST'])
  if (request.method === 'POST') assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const url = new URL(request.url)
  const body = request.method === 'POST' ? await readJson(request, 16_000) : {}
  const reference = String(body.reference || url.searchParams.get('reference') || url.searchParams.get('trxref') || '').trim()
  if (!reference || reference.length > 160) throw new HttpError(400, 'Payment reference is required.', 'reference-required')

  const transaction = await verifyTransaction(reference)
  const fingerprint = crypto
    .createHash('sha256')
    .update(`verify:${transaction.reference}:${transaction.amountMinor}:${transaction.currency}:${transaction.status}`)
    .digest('hex')

  // settlePayment delegates to the service-role wrs_settle_payment RPC.
  const result = await settlePayment(resolved.user.id, transaction, fingerprint)
  return appendCookies(json({ ...result, reference: transaction.reference }), resolved.cookies)
})
