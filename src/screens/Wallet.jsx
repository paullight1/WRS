import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import { Button, Card, DataRow, Disclosure, SectionTitle } from '../components/ui.jsx'
import { browserFinanceClient } from '../infrastructure/finance/browserFinanceClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

function formatMoney(amountMinor, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amountMinor || 0) / 100)
}

function DemoWallet() {
  const depositPolicy = getSensitiveActionPolicy('wallet.deposit')
  const withdrawPolicy = getSensitiveActionPolicy('wallet.withdraw')
  return (
    <AppShell title="Wallet demo" back avatar={false}>
      <Disclosure icon="science">
        All values and actions in demo mode are illustrative. No deposit, withdrawal or ledger entry is created.
      </Disclosure>
      <Card className="p-card-padding text-center">
        <p className="text-label-md text-outline">Illustrative available balance</p>
        <p className="tnum mt-2 font-headline-lg text-headline-lg text-on-surface">$154.40</p>
        <p className="mt-2 text-body-sm text-on-surface-variant">$32.00 demo pending · no live account</p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button disabled={!depositPolicy.enabled} icon="add">
          Preview deposit
        </Button>
        <Button disabled={!withdrawPolicy.enabled} variant="tonal" icon="arrow_outward">
          Preview withdrawal
        </Button>
      </div>
    </AppShell>
  )
}

function LiveWallet() {
  const withdrawPolicy = getSensitiveActionPolicy('wallet.withdraw')
  const depositPolicy = getSensitiveActionPolicy('wallet.deposit')
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [payoutMethodId, setPayoutMethodId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const currency = 'USD'

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await browserFinanceClient.wallet(currency)
      setWallet(result.wallet)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Wallet could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    browserFinanceClient
      .wallet(currency)
      .then((result) => {
        if (!active) return
        setWallet(result.wallet)
        setError('')
      })
      .catch((reason) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Wallet could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const createPayout = async () => {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const result = await browserFinanceClient.createPayoutMethod({
        accountNumber,
        bankCode,
        accountName,
        currency,
      })
      const method = result.payoutMethod
      if (!method || typeof method !== 'object' || typeof method.id !== 'string') {
        throw new Error('Payout method could not be confirmed.')
      }
      setPayoutMethodId(method.id)
      setMessage(`Verified payout method saved: ${method.maskedAccount || 'bank account'}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Payout method could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  const withdraw = async () => {
    const amountMinor = Math.round(Number(amount) * 100)
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setError('Enter a valid withdrawal amount.')
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const key = `withdraw:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
      const result = await browserFinanceClient.withdraw({ payoutMethodId, amountMinor, currency, idempotencyKey: key })
      setMessage(`Withdrawal ${result.reference} is pending provider settlement.`)
      setAmount('')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Withdrawal could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Wallet" back avatar={false}>
        <LoadingView
          title="Loading wallet ledger"
          desc="Calculating available and pending amounts from posted entries."
        />
      </AppShell>
    )
  }
  if (error && !wallet) {
    return (
      <AppShell title="Wallet" back avatar={false}>
        <StateView
          kind="error"
          title="Wallet unavailable"
          desc={error}
          action={<Button onClick={refresh}>Try again</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title="Wallet" subtitle="Ledger-derived balances" back avatar={false}>
      <Disclosure icon="verified_user">
        The wallet has no mutable balance field. Available and pending amounts are recalculated from immutable
        double-entry ledger records on every request.
      </Disclosure>

      <Card className="p-card-padding">
        <p className="text-label-md text-on-surface-variant">Available</p>
        <p className="tnum mt-1 font-headline-lg text-headline-lg text-on-surface">
          {formatMoney(wallet?.availableMinor, wallet?.currency || currency)}
        </p>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Pending withdrawals: {formatMoney(wallet?.pendingWithdrawalMinor, wallet?.currency || currency)}
        </p>
      </Card>

      <section>
        <SectionTitle>Payout method</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <input
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="Account name"
            aria-label="Payout account name"
            className="w-full rounded-xl border border-outline-variant bg-black/20 px-4 py-3 text-on-surface outline-none"
          />
          <input
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
            placeholder="Account number"
            inputMode="numeric"
            aria-label="Payout account number"
            className="w-full rounded-xl border border-outline-variant bg-black/20 px-4 py-3 text-on-surface outline-none"
          />
          <input
            value={bankCode}
            onChange={(event) => setBankCode(event.target.value)}
            placeholder="Provider bank code"
            aria-label="Payout bank code"
            className="w-full rounded-xl border border-outline-variant bg-black/20 px-4 py-3 text-on-surface outline-none"
          />
          <Button
            onClick={createPayout}
            loading={submitting}
            disabled={!withdrawPolicy.authoritative || !accountName || !accountNumber || !bankCode}
          >
            Verify payout method
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Withdraw</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            aria-label="Withdrawal amount in USD"
            className="w-full rounded-xl border border-outline-variant bg-black/20 px-4 py-3 text-on-surface outline-none"
          />
          <Button
            variant="tonal"
            onClick={withdraw}
            loading={submitting}
            disabled={!withdrawPolicy.authoritative || !payoutMethodId || !amount}
          >
            Request withdrawal
          </Button>
          <p className="text-label-sm text-outline">
            KYC, payout-method ownership and available balance are rechecked server-side under a serialized ledger
            reservation.
          </p>
        </Card>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-error/30 bg-error/10 p-3 text-label-sm text-error">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-tertiary/30 bg-tertiary/10 p-3 text-label-sm text-on-surface"
        >
          {message}
        </p>
      )}

      <section>
        <SectionTitle>Controls</SectionTitle>
        <Card className="divide-y divide-white/8">
          <DataRow label="Ledger currency" value={wallet?.currency || currency} />
          <DataRow label="Deposits" value={depositPolicy.authoritative ? 'Available' : 'Not enabled'} />
          <DataRow label="Withdrawal settlement" value="Provider verified" />
        </Card>
      </section>
    </AppShell>
  )
}

export default function Wallet() {
  return runtimeConfig.isDemo ? <DemoWallet /> : <LiveWallet />
}
