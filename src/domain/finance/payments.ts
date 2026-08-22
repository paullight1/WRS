export type PaymentStatus = 'initialized' | 'pending' | 'succeeded' | 'failed' | 'refunded' | 'reversed'
export type WithdrawalStatus = 'reserved' | 'provider_pending' | 'succeeded' | 'failed' | 'reversed'

const paymentTransitions: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  initialized: new Set(['pending', 'succeeded', 'failed']),
  pending: new Set(['succeeded', 'failed']),
  succeeded: new Set(['refunded', 'reversed']),
  failed: new Set(),
  refunded: new Set(),
  reversed: new Set(),
}

const withdrawalTransitions: Record<WithdrawalStatus, ReadonlySet<WithdrawalStatus>> = {
  reserved: new Set(['provider_pending', 'failed']),
  provider_pending: new Set(['succeeded', 'failed']),
  succeeded: new Set(['reversed']),
  failed: new Set(),
  reversed: new Set(),
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (from === to) return
  if (!paymentTransitions[from]?.has(to)) throw new Error(`Invalid payment transition: ${from} -> ${to}`)
}

export function assertWithdrawalTransition(from: WithdrawalStatus, to: WithdrawalStatus): void {
  if (from === to) return
  if (!withdrawalTransitions[from]?.has(to)) throw new Error(`Invalid withdrawal transition: ${from} -> ${to}`)
}

export function providerPaymentIsSettled(status: string): boolean {
  return String(status || '').toLowerCase() === 'success'
}

export function providerTransferIsSettled(status: string): boolean {
  return ['success', 'successful'].includes(String(status || '').toLowerCase())
}
