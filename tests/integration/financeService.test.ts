import { describe, expect, it, vi } from 'vitest'
import { FinanceService, type FinanceRepository, type PaymentProvider } from '../../src/services/finance/FinanceService'

function harness(overrides: Partial<PaymentProvider> = {}) {
  const repository: FinanceRepository = {
    createPaymentIntent: vi.fn(async () => ({
      intentId: 'intent-1',
      reference: 'wrs-pay-intent-1',
      amountMinor: 10_000,
      currency: 'USD',
      email: 'user@example.com',
      callbackUrl: 'https://wrs.example/success',
      metadata: { packageSlug: 'professional' },
    })),
    attachPaymentProvider: vi.fn(async () => undefined),
    settlePayment: vi.fn(async (_userId, tx) => ({ status: 'succeeded', reference: tx.reference })),
    walletSnapshot: vi.fn(async () => ({ availableMinor: 0 })),
    reserveWithdrawal: vi.fn(async () => ({ withdrawalId: 'wd-1', reference: 'wrs-wd-1234567890123456' })),
    markWithdrawalProviderPending: vi.fn(async () => undefined),
    settleWithdrawal: vi.fn(async () => ({ status: 'succeeded' })),
    failWithdrawal: vi.fn(async () => ({ status: 'failed' })),
  }
  const provider: PaymentProvider = {
    initializeTransaction: vi.fn(async (intent) => ({
      authorizationUrl: 'https://checkout.paystack.com/test',
      accessCode: 'access',
      reference: intent.reference,
    })),
    verifyTransaction: vi.fn(async (reference) => ({
      reference,
      amountMinor: 10_000,
      currency: 'USD',
      status: 'success',
      raw: {},
    })),
    initiateTransfer: vi.fn(async (input) => ({ reference: input.reference, status: 'pending' })),
    verifyTransfer: vi.fn(async (reference) => ({
      reference,
      amountMinor: 2_000,
      currency: 'USD',
      status: 'success',
      raw: {},
    })),
    ...overrides,
  }
  return { service: new FinanceService(repository, provider), repository, provider }
}

describe('FinanceService', () => {
  it('initializes against server-owned intent values and attaches provider reference', async () => {
    const { service, repository, provider } = harness()
    const result = await service.initializePackagePayment('user-1', 'professional', 'idem-1234567890123456')
    expect(result.amountMinor).toBe(10_000)
    expect(provider.initializeTransaction).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 10_000 }))
    expect(repository.attachPaymentProvider).toHaveBeenCalledWith('intent-1', 'wrs-pay-intent-1', 'access')
  })

  it('does not settle a provider transaction that is still pending', async () => {
    const { service, repository } = harness({
      verifyTransaction: vi.fn(async (reference) => ({
        reference,
        amountMinor: 10_000,
        currency: 'USD',
        status: 'pending',
        raw: {},
      })),
    })
    await expect(service.verifyAndSettlePayment('user-1', 'ref-1', 'event-1')).resolves.toEqual({
      status: 'pending',
      providerStatus: 'pending',
    })
    expect(repository.settlePayment).not.toHaveBeenCalled()
  })

  it('passes verified settlement through one repository idempotency boundary', async () => {
    const { service, repository } = harness()
    await service.verifyAndSettlePayment('user-1', 'ref-1', 'event-1')
    expect(repository.settlePayment).toHaveBeenCalledTimes(1)
    expect(repository.settlePayment).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ reference: 'ref-1', amountMinor: 10_000, currency: 'USD', status: 'success' }),
      'event-1',
    )
  })

  it('compensates a ledger reservation when transfer initiation fails', async () => {
    const { service, repository } = harness({
      initiateTransfer: vi.fn(async () => {
        throw new Error('provider down')
      }),
    })
    await expect(
      service.dispatchWithdrawal({
        userId: 'user-1',
        payoutMethodId: 'method-1',
        recipientCode: 'RCP_1',
        amountMinor: 2_000,
        currency: 'USD',
        idempotencyKey: 'withdraw-1234567890123456',
        reason: 'test',
      }),
    ).rejects.toThrow('provider down')
    expect(repository.failWithdrawal).toHaveBeenCalledWith('wd-1', 'provider down')
    expect(repository.markWithdrawalProviderPending).not.toHaveBeenCalled()
  })

  it('does not settle transfer initiation; settlement waits for provider verification', async () => {
    const { service, repository } = harness()
    await service.dispatchWithdrawal({
      userId: 'user-1',
      payoutMethodId: 'method-1',
      recipientCode: 'RCP_1',
      amountMinor: 2_000,
      currency: 'USD',
      idempotencyKey: 'withdraw-1234567890123456',
      reason: 'test',
    })
    expect(repository.markWithdrawalProviderPending).toHaveBeenCalledTimes(1)
    expect(repository.settleWithdrawal).not.toHaveBeenCalled()
    await service.reconcileTransfer('wrs-wd-1234567890123456')
    expect(repository.settleWithdrawal).toHaveBeenCalledTimes(1)
  })
})
