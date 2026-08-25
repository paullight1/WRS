import { describe, expect, it } from 'vitest'
import { assertBalanced, assertMinorAmount, normalizeCurrency } from '../../src/domain/finance/ledger'
import { assertPaymentTransition, assertWithdrawalTransition } from '../../src/domain/finance/payments'

describe('Plan 5 finance domain', () => {
  it('accepts a balanced integer-minor-unit journal', () => {
    expect(
      assertBalanced([
        { accountCode: 'asset:cash:USD', direction: 'debit', amountMinor: 5000, currency: 'usd' },
        { accountCode: 'revenue:packages:USD', direction: 'credit', amountMinor: 5000, currency: 'USD' },
      ]),
    ).toMatchObject({ currency: 'USD', debitMinor: 5000, creditMinor: 5000 })
  })

  it('rejects imbalanced, mixed-currency and non-integer money', () => {
    expect(() =>
      assertBalanced([
        { accountCode: 'a', direction: 'debit', amountMinor: 5000, currency: 'USD' },
        { accountCode: 'b', direction: 'credit', amountMinor: 4000, currency: 'USD' },
      ]),
    ).toThrow(/balanced/i)
    expect(() =>
      assertBalanced([
        { accountCode: 'a', direction: 'debit', amountMinor: 5000, currency: 'USD' },
        { accountCode: 'b', direction: 'credit', amountMinor: 5000, currency: 'NGN' },
      ]),
    ).toThrow(/mix currencies/i)
    expect(() => assertMinorAmount(1.25)).toThrow(/integer/i)
    expect(() => assertMinorAmount(-1)).toThrow(/positive/i)
    expect(normalizeCurrency('ngn')).toBe('NGN')
  })

  it('rejects impossible payment and withdrawal transitions', () => {
    expect(() => assertPaymentTransition('succeeded', 'pending')).toThrow(/invalid payment transition/i)
    expect(() => assertWithdrawalTransition('failed', 'provider_pending')).toThrow(/invalid withdrawal transition/i)
    expect(() => assertPaymentTransition('pending', 'succeeded')).not.toThrow()
    expect(() => assertWithdrawalTransition('provider_pending', 'succeeded')).not.toThrow()
  })
})
