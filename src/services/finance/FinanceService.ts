import { assertMinorAmount, normalizeCurrency } from '../../domain/finance/ledger'
import { providerPaymentIsSettled, providerTransferIsSettled } from '../../domain/finance/payments'

export interface PaymentInitialization {
  intentId: string
  reference: string
  amountMinor: number
  currency: string
  email: string
  callbackUrl: string
  metadata: Record<string, unknown>
}

export interface VerifiedProviderTransaction {
  reference: string
  amountMinor: number
  currency: string
  status: string
  paidAt?: string | null
  raw: Record<string, unknown>
}

export interface VerifiedProviderTransfer {
  reference: string
  amountMinor: number
  currency: string
  status: string
  raw: Record<string, unknown>
}

export interface FinanceRepository {
  createPaymentIntent(userId: string, packageSlug: string, idempotencyKey: string): Promise<PaymentInitialization>
  attachPaymentProvider(intentId: string, reference: string, accessCode: string | null): Promise<void>
  settlePayment(
    userId: string | null,
    transaction: VerifiedProviderTransaction,
    eventFingerprint: string,
  ): Promise<unknown>
  walletSnapshot(userId: string, currency?: string): Promise<unknown>
  reserveWithdrawal(
    userId: string,
    payoutMethodId: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<unknown>
  markWithdrawalProviderPending(withdrawalId: string, reference: string): Promise<void>
  settleWithdrawal(transfer: VerifiedProviderTransfer): Promise<unknown>
  failWithdrawal(withdrawalId: string, reason: string): Promise<unknown>
}

export interface PaymentProvider {
  initializeTransaction(
    input: PaymentInitialization,
  ): Promise<{ authorizationUrl: string; accessCode: string; reference: string }>
  verifyTransaction(reference: string): Promise<VerifiedProviderTransaction>
  initiateTransfer(input: {
    amountMinor: number
    recipientCode: string
    reference: string
    currency: string
    reason: string
  }): Promise<{ reference: string; status: string }>
  verifyTransfer(reference: string): Promise<VerifiedProviderTransfer>
}

export class FinanceService {
  constructor(
    private readonly repository: FinanceRepository,
    private readonly provider: PaymentProvider,
  ) {}

  async initializePackagePayment(userId: string, packageSlug: string, idempotencyKey: string) {
    const intent = await this.repository.createPaymentIntent(userId, packageSlug, idempotencyKey)
    const provider = await this.provider.initializeTransaction(intent)
    await this.repository.attachPaymentProvider(intent.intentId, provider.reference, provider.accessCode)
    return { ...intent, authorizationUrl: provider.authorizationUrl, providerReference: provider.reference }
  }

  async verifyAndSettlePayment(userId: string | null, reference: string, eventFingerprint: string) {
    const verified = await this.provider.verifyTransaction(reference)
    assertMinorAmount(verified.amountMinor)
    verified.currency = normalizeCurrency(verified.currency)
    if (!providerPaymentIsSettled(verified.status)) return { status: 'pending', providerStatus: verified.status }
    return this.repository.settlePayment(userId, verified, eventFingerprint)
  }

  async dispatchWithdrawal(input: {
    userId: string
    payoutMethodId: string
    recipientCode: string
    amountMinor: number
    currency: string
    idempotencyKey: string
    reason: string
  }) {
    assertMinorAmount(input.amountMinor)
    const currency = normalizeCurrency(input.currency)
    const reserved = (await this.repository.reserveWithdrawal(
      input.userId,
      input.payoutMethodId,
      input.amountMinor,
      currency,
      input.idempotencyKey,
    )) as { withdrawalId: string; reference: string }

    try {
      const provider = await this.provider.initiateTransfer({
        amountMinor: input.amountMinor,
        recipientCode: input.recipientCode,
        reference: reserved.reference,
        currency,
        reason: input.reason,
      })
      await this.repository.markWithdrawalProviderPending(reserved.withdrawalId, provider.reference)
      return { ...reserved, providerStatus: provider.status }
    } catch (error) {
      await this.repository.failWithdrawal(
        reserved.withdrawalId,
        error instanceof Error ? error.message : 'provider-error',
      )
      throw error
    }
  }

  async reconcileTransfer(reference: string) {
    const verified = await this.provider.verifyTransfer(reference)
    if (!providerTransferIsSettled(verified.status)) return verified
    await this.repository.settleWithdrawal(verified)
    return verified
  }
}
