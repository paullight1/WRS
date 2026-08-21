export function evaluatePaymentSuccessAccess({ mode, search = '', authority = null }) {
  const params = new URLSearchParams(search)

  if (mode === 'demo') {
    if (params.get('demo') !== '1') {
      return { allowed: false, authoritative: false, reason: 'Demo purchase preview requires an explicit demo marker.' }
    }
    return {
      allowed: true,
      authoritative: false,
      title: 'Demo purchase preview',
      reason: 'No payment was processed and no entitlement was provisioned.',
    }
  }

  const transactionId = params.get('tx')
  if (!transactionId || !authority) {
    return { allowed: false, authoritative: false, reason: 'Verified transaction evidence is required.' }
  }

  const allowed =
    authority.id === transactionId &&
    authority.status === 'confirmed' &&
    authority.belongsToUser === true

  return allowed
    ? { allowed: true, authoritative: true, title: 'Payment confirmed', transactionId }
    : { allowed: false, authoritative: false, reason: 'Transaction is missing, unconfirmed, or unauthorized.' }
}
