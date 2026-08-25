import { functionHandler, HttpError, json, requireMethod } from '../../server/http.js'
import {
  failWithdrawal,
  processPaymentRefund,
  reverseWithdrawal,
  settlePayment,
  settleWithdrawal,
  withdrawalByProviderReference,
} from '../../server/finance.js'
import { paystackEventFingerprint, verifyPaystackWebhook } from '../../server/paystack.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')
  if (!verifyPaystackWebhook(rawBody, signature)) {
    throw new HttpError(401, 'Invalid payment webhook signature.', 'invalid-webhook')
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    throw new HttpError(400, 'Webhook payload must be valid JSON.', 'bad-webhook')
  }

  const fingerprint = paystackEventFingerprint(rawBody)
  const type = String(event.event || '')
  const data = event.data || {}

  if (type === 'charge.success') {
    const transaction = {
      reference: String(data.reference || ''),
      amountMinor: Number(data.amount),
      currency: String(data.currency || '').toUpperCase(),
      status: String(data.status || 'success'),
      paidAt: data.paid_at || data.paidAt || null,
      raw: data,
    }
    // settlePayment delegates to the service-role wrs_settle_payment RPC.
    await settlePayment(null, transaction, fingerprint)
  } else if (type === 'refund.processed') {
    await processPaymentRefund({
      paymentReference: String(data.transaction_reference || data.transaction?.reference || ''),
      refundReference: String(data.refund_reference || data.reference || data.id || ''),
      amountMinor: Number(data.amount),
      currency: String(data.currency || '').toUpperCase(),
      eventFingerprint: fingerprint,
      raw: data,
    })
  } else if (type === 'transfer.success') {
    await settleWithdrawal({
      reference: String(data.reference || ''),
      amountMinor: Number(data.amount),
      currency: String(data.currency || '').toUpperCase(),
      status: String(data.status || 'success'),
      raw: data,
    })
  } else if (type === 'transfer.failed') {
    const reference = String(data.reference || '')
    const withdrawal = await withdrawalByProviderReference(reference)
    if (withdrawal) await failWithdrawal(withdrawal.id, type)
  } else if (type === 'transfer.reversed') {
    await reverseWithdrawal(String(data.reference || ''), type)
  }

  return json({ received: true })
})
