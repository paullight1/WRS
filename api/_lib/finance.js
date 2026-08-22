import { HttpError } from './http.js'
import { serviceRest, serviceRpc } from './supabase.js'

export async function createPaymentIntent(userId, packageSlug, currency, idempotencyKey) {
  const { data } = await serviceRpc('wrs_create_payment_intent', {
    p_user_id: userId,
    p_package_slug: packageSlug,
    p_currency: String(currency || 'USD').toUpperCase(),
    p_provider: 'paystack',
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function attachPaymentProvider(userId, intentId, reference, accessCode) {
  await serviceRpc('wrs_attach_payment_provider_reference', {
    p_user_id: userId,
    p_intent_id: intentId,
    p_provider_reference: reference,
    p_access_code: accessCode || null,
  })
}

export async function settlePayment(userId, transaction, eventFingerprint) {
  const { data } = await serviceRpc('wrs_settle_payment', {
    p_user_id: userId || null,
    p_provider: 'paystack',
    p_provider_reference: transaction.reference,
    p_amount_minor: transaction.amountMinor,
    p_currency: transaction.currency,
    p_provider_status: transaction.status,
    p_event_fingerprint: eventFingerprint,
    p_payload: transaction.raw || {},
  })
  return data
}

export async function processPaymentRefund(input) {
  const { data } = await serviceRpc('wrs_process_payment_refund', {
    p_provider: 'paystack',
    p_provider_reference: input.paymentReference,
    p_refund_reference: input.refundReference || input.eventFingerprint,
    p_amount_minor: input.amountMinor,
    p_currency: input.currency,
    p_event_fingerprint: input.eventFingerprint,
    p_payload: input.raw || {},
  })
  return data
}

export async function walletSnapshot(userId, currency = 'USD') {
  const { data } = await serviceRpc('wrs_wallet_snapshot', {
    p_user_id: userId,
    p_currency: String(currency || 'USD').toUpperCase(),
  })
  return data
}

export async function createPayoutMethod(userId, input, recipientCode) {
  const masked = `${'*'.repeat(Math.max(0, String(input.accountNumber).length - 4))}${String(input.accountNumber).slice(-4)}`
  const { data } = await serviceRest('/rest/v1/payout_methods', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      user_id: userId,
      provider: 'paystack',
      recipient_code: recipientCode,
      masked_account: masked,
      bank_code: input.bankCode,
      account_name: input.accountName,
      currency: String(input.currency || 'NGN').toUpperCase(),
      status: 'verified',
    },
  })
  return Array.isArray(data) ? data[0] : data
}

export async function payoutMethodForUser(userId, payoutMethodId) {
  const { data } = await serviceRest(
    `/rest/v1/payout_methods?id=eq.${encodeURIComponent(payoutMethodId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.verified&select=*&limit=1`,
  )
  const method = Array.isArray(data) ? data[0] || null : null
  if (!method) throw new HttpError(404, 'Verified payout method not found.', 'payout-method-not-found')
  return method
}

export async function reserveWithdrawal(userId, payoutMethodId, amountMinor, currency, idempotencyKey) {
  const { data } = await serviceRpc('wrs_reserve_withdrawal', {
    p_user_id: userId,
    p_payout_method_id: payoutMethodId,
    p_amount_minor: amountMinor,
    p_currency: String(currency || '').toUpperCase(),
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function markWithdrawalProviderPending(withdrawalId, providerReference) {
  await serviceRpc('wrs_mark_withdrawal_provider_pending', {
    p_withdrawal_id: withdrawalId,
    p_provider_reference: providerReference,
  })
}

export async function failWithdrawal(withdrawalId, reason) {
  const { data } = await serviceRpc('wrs_fail_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_reason: String(reason || 'provider-error').slice(0, 500),
  })
  return data
}

export async function settleWithdrawal(transfer) {
  const { data } = await serviceRpc('wrs_settle_withdrawal', {
    p_provider: 'paystack',
    p_provider_reference: transfer.reference,
    p_amount_minor: transfer.amountMinor,
    p_currency: transfer.currency,
    p_provider_status: transfer.status,
  })
  return data
}

export async function reverseWithdrawal(reference, reason = 'provider-reversed') {
  const { data } = await serviceRpc('wrs_reverse_withdrawal', {
    p_provider: 'paystack',
    p_provider_reference: reference,
    p_reason: reason,
  })
  return data
}

export async function withdrawalByProviderReference(reference) {
  const { data } = await serviceRest(
    `/rest/v1/withdrawals?provider=eq.paystack&provider_reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

export async function pendingPayments(limit = 50) {
  const { data } = await serviceRest(
    `/rest/v1/payment_intents?status=in.(initialized,pending)&provider_reference=not.is.null&select=*&order=created_at.asc&limit=${Math.min(100, Math.max(1, limit))}`,
  )
  return Array.isArray(data) ? data : []
}

export async function pendingWithdrawals(limit = 50) {
  const { data } = await serviceRest(
    `/rest/v1/withdrawals?status=in.(reserved,provider_pending)&provider_reference=not.is.null&select=*&order=created_at.asc&limit=${Math.min(100, Math.max(1, limit))}`,
  )
  return Array.isArray(data) ? data : []
}

export async function recordReconciliation(input) {
  await serviceRest('/rest/v1/financial_reconciliations', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      provider: 'paystack',
      provider_reference: input.reference,
      local_status: input.localStatus,
      provider_status: input.providerStatus,
      matched: input.matched,
      details: input.details || {},
    },
  })
}
