type Json = Record<string, unknown>

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : 'Financial request failed.'
    throw new Error(message)
  }
  return body as T
}

export interface WalletSnapshot {
  currency: string
  availableMinor: number
  pendingWithdrawalMinor: number
}

export interface WalletTransaction {
  id: string
  kind: string
  status: string
  reference: string
  providerReference: string | null
  direction: 'debit' | 'credit'
  amountMinor: number
  currency: string
  createdAt: string
}

export const browserFinanceClient = {
  initializePackagePayment: (packageSlug: string, currency: string, idempotencyKey: string) =>
    request<{ intentId: string; reference: string; authorizationUrl: string; amountMinor: number; currency: string }>(
      '/api/payments/initialize',
      {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
        body: JSON.stringify({ packageSlug, currency, idempotencyKey }),
      },
    ),
  verifyPayment: (reference: string) =>
    request<{ status: string; reference: string; intentId?: string; transactionId?: string }>(
      `/api/payments/verify?reference=${encodeURIComponent(reference)}`,
    ),
  wallet: (currency = 'USD') =>
    request<{ wallet: WalletSnapshot }>(`/api/wallet?currency=${encodeURIComponent(currency)}`),
  transactions: (currency = 'USD') =>
    request<{ transactions: WalletTransaction[] }>(`/api/wallet/transactions?currency=${encodeURIComponent(currency)}`),
  createPayoutMethod: (input: {
    accountNumber: string
    bankCode: string
    accountName: string
    currency: string
  }) => request<Json>('/api/wallet/payout-method', { method: 'POST', body: JSON.stringify(input) }),
  withdraw: (input: { payoutMethodId: string; amountMinor: number; currency: string; idempotencyKey: string }) =>
    request<{ withdrawalId: string; reference: string; status: string }>('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'idempotency-key': input.idempotencyKey },
      body: JSON.stringify(input),
    }),
}
