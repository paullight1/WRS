export type CurrencyCode = string
export type LedgerDirection = 'debit' | 'credit'

export interface Money {
  amountMinor: number
  currency: CurrencyCode
}

export interface LedgerEntryDraft extends Money {
  accountCode: string
  direction: LedgerDirection
}

export interface BalancedJournal {
  currency: CurrencyCode
  debitMinor: number
  creditMinor: number
  entries: LedgerEntryDraft[]
}

export function normalizeCurrency(value: string): CurrencyCode {
  const currency = String(value || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code.')
  return currency
}

export function assertMinorAmount(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Money must use a positive safe integer in minor units.')
  }
  return amountMinor
}

export function assertBalanced(entries: LedgerEntryDraft[]): BalancedJournal {
  if (!Array.isArray(entries) || entries.length < 2) throw new Error('A journal requires at least two entries.')

  const normalized = entries.map((entry) => ({
    ...entry,
    accountCode: String(entry.accountCode || '').trim(),
    currency: normalizeCurrency(entry.currency),
    amountMinor: assertMinorAmount(entry.amountMinor),
  }))

  if (normalized.some((entry) => !entry.accountCode)) throw new Error('Every journal entry requires an account code.')
  const currency = normalized[0].currency
  if (normalized.some((entry) => entry.currency !== currency)) throw new Error('A journal cannot mix currencies.')

  const debitMinor = normalized
    .filter((entry) => entry.direction === 'debit')
    .reduce((total, entry) => total + entry.amountMinor, 0)
  const creditMinor = normalized
    .filter((entry) => entry.direction === 'credit')
    .reduce((total, entry) => total + entry.amountMinor, 0)

  if (!debitMinor || debitMinor !== creditMinor) throw new Error('Ledger transaction is not balanced.')

  return { currency, debitMinor, creditMinor, entries: normalized }
}

export function signedAccountDelta(direction: LedgerDirection, amountMinor: number): number {
  assertMinorAmount(amountMinor)
  return direction === 'debit' ? amountMinor : -amountMinor
}
