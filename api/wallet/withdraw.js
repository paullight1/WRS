import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import {
  failWithdrawal,
  markWithdrawalProviderPending,
  payoutMethodForUser,
  reserveWithdrawal,
} from '../../server/finance.js'
import { initiateTransfer } from '../../server/paystack.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true, kyc: true })
  const body = await readJson(request, 24_000)
  const payoutMethodId = String(body.payoutMethodId || '').trim()
  const amountMinor = Number(body.amountMinor)
  const currency = String(body.currency || '').trim().toUpperCase()
  const idempotencyKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim()

  if (!payoutMethodId) throw new HttpError(400, 'Payout method is required.', 'payout-method-required')
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new HttpError(400, 'Withdrawal amount must be a positive integer in minor units.', 'invalid-amount')
  }
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, 'Withdrawal currency is invalid.', 'invalid-currency')
  if (idempotencyKey.length < 16 || idempotencyKey.length > 160) {
    throw new HttpError(400, 'A stable idempotency key is required.', 'idempotency-required')
  }

  const method = await payoutMethodForUser(resolved.user.id, payoutMethodId)
  if (method.currency !== currency) throw new HttpError(409, 'Payout method currency does not match.', 'currency-mismatch')

  // reserveWithdrawal delegates to wrs_reserve_withdrawal, which serializes KYC/balance checks.
  const reserved = await reserveWithdrawal(resolved.user.id, payoutMethodId, amountMinor, currency, idempotencyKey)
  try {
    const provider = await initiateTransfer({
      amountMinor,
      recipientCode: method.recipient_code,
      reference: reserved.reference,
      currency,
      reason: 'WRS wallet withdrawal',
    })
    await markWithdrawalProviderPending(reserved.withdrawalId, provider.reference)
    return appendCookies(
      json({
        withdrawalId: reserved.withdrawalId,
        reference: provider.reference,
        status: 'provider_pending',
      }),
      resolved.cookies,
    )
  } catch (error) {
    // Compensation is authoritative through wrs_fail_withdrawal; client retries cannot double-credit.
    await failWithdrawal(reserved.withdrawalId, error instanceof Error ? error.message : 'provider-error').catch(() => undefined)
    throw error
  }
})
