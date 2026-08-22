import { functionHandler, HttpError, json, requireMethod } from '../../server/http.js'
import {
  failWithdrawal,
  pendingPayments,
  pendingWithdrawals,
  recordReconciliation,
  settlePayment,
  settleWithdrawal,
} from '../../server/finance.js'
import { verifyTransaction, verifyTransfer } from '../../server/paystack.js'

function requireCron(request) {
  const expected = String(process.env.CRON_SECRET || '')
  if (!expected) throw new HttpError(503, 'Reconciliation cron is not configured.', 'cron-unavailable')
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    throw new HttpError(401, 'Unauthorized reconciliation request.', 'unauthorized')
  }
}

export default functionHandler(async (request) => {
  requireMethod(request, ['GET', 'POST'])
  requireCron(request)

  const payments = await pendingPayments(50)
  const withdrawals = await pendingWithdrawals(50)
  let checked = 0
  let mismatches = 0

  for (const payment of payments) {
    const verified = await verifyTransaction(payment.provider_reference)
    const fingerprint = `reconcile:${verified.reference}:${verified.amountMinor}:${verified.currency}:${verified.status}`
    let result
    try {
      result = await settlePayment(payment.user_id, verified, fingerprint)
    } catch (error) {
      result = { status: 'mismatch', message: error instanceof Error ? error.message : 'settlement-error' }
    }
    const matched =
      result.status !== 'mismatch' && (verified.status === 'success' ? result.status === 'succeeded' : true)
    if (!matched) mismatches += 1
    checked += 1
    await recordReconciliation({
      resourceType: 'payment',
      resourceId: payment.id,
      reference: payment.provider_reference,
      localStatus: payment.status,
      providerStatus: verified.status,
      matched,
      details: result,
    })
  }

  for (const withdrawal of withdrawals) {
    const verified = await verifyTransfer(withdrawal.provider_reference)
    let result = { status: withdrawal.status }
    if (['success', 'successful'].includes(String(verified.status).toLowerCase())) {
      result = await settleWithdrawal(verified)
    } else if (['failed', 'reversed'].includes(String(verified.status).toLowerCase())) {
      result = await failWithdrawal(withdrawal.id, `provider-${verified.status}`)
    }
    const providerDone = ['success', 'successful', 'failed', 'reversed'].includes(String(verified.status).toLowerCase())
    const localDone = ['succeeded', 'failed', 'reversed'].includes(String(result.status).toLowerCase())
    const matched = providerDone ? localDone : true
    if (!matched) mismatches += 1
    checked += 1
    await recordReconciliation({
      resourceType: 'withdrawal',
      resourceId: withdrawal.id,
      reference: withdrawal.provider_reference,
      localStatus: withdrawal.status,
      providerStatus: verified.status,
      matched,
      details: result,
    })
  }

  return json({ checked, mismatches, reconciledAt: new Date().toISOString() })
})
