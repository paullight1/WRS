import { useEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, DataRow, SectionTitle } from '../components/ui.jsx'
import { browserFinanceClient } from '../infrastructure/finance/browserFinanceClient.ts'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'
import { RoboCoinWallet } from '../components/dashboard/WalletDashboard.jsx'
import DashboardIcon from '../components/dashboard/DashboardIcon.jsx'
import { browserMiningClient } from '../infrastructure/mining/browserMiningClient.ts'
import { atomicUnitsToDecimal } from '../domain/mining/metrics.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { useAuth } from '../components/auth/AuthProvider.jsx'

function formatMoney(amountMinor, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amountMinor || 0) / 100)
}

function LiveWallet() {
  const auth = useAuth()
  const cashAvailable = auth.session?.kycStatus === 'verified'
  const withdrawPolicy = getSensitiveActionPolicy('wallet.withdraw')
  const depositPolicy = getSensitiveActionPolicy('wallet.deposit')
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(cashAvailable)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [message, setMessage] = useState('')
  const [payoutMethodId, setPayoutMethodId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const currency = 'USD'
  const payoutPanel = useRef(null)
  const [mining, setMining] = useState(null)
  const [miningLoading, setMiningLoading] = useState(!runtimeConfig.isDemo)

  useEffect(() => {
    if (runtimeConfig.isDemo) return undefined
    let active = true
    browserMiningClient
      .snapshot()
      .then((snapshot) => {
        if (active && snapshot?.authoritative === true) setMining(snapshot)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setMiningLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openWithdrawal = () => {
    if (!payoutPanel.current) return
    payoutPanel.current.open = true
    payoutPanel.current.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    payoutPanel.current.querySelector('input')?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (window.location.hash === '#withdraw') openWithdrawal()
  }, [])

  let rbc = null
  try {
    if (mining?.balance?.availableAtomic !== null && Number.isInteger(mining?.balance?.atomicScale)) {
      const [whole, fraction = ''] = atomicUnitsToDecimal(
        mining.balance.availableAtomic,
        mining.balance.atomicScale,
      ).split('.')
      rbc = `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.replace(/0+$/, '').padEnd(2, '0')} RBC`
    }
  } catch {
    /* Keep an unavailable balance distinct from zero. */
  }

  const refresh = async () => {
    if (!cashAvailable) return
    setLoading(true)
    setError('')
    const [walletResult, transactionResult] = await Promise.allSettled([
      browserFinanceClient.wallet(currency),
      browserFinanceClient.transactions(currency),
    ])
    if (walletResult.status === 'fulfilled' && walletResult.value?.wallet) {
      setWallet(walletResult.value.wallet)
    } else {
      setError(walletResult.reason instanceof Error ? walletResult.reason.message : 'Wallet could not be loaded.')
    }
    if (transactionResult.status === 'fulfilled' && Array.isArray(transactionResult.value?.transactions)) {
      setTransactions(transactionResult.value.transactions)
      setHistoryError('')
    } else {
      setHistoryError(
        transactionResult.reason instanceof Error
          ? transactionResult.reason.message
          : 'Wallet activity could not be loaded.',
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!cashAvailable) return undefined
    let active = true
    Promise.allSettled([browserFinanceClient.wallet(currency), browserFinanceClient.transactions(currency)]).then(
      ([walletResult, transactionResult]) => {
        if (!active) return
        if (walletResult.status === 'fulfilled' && walletResult.value?.wallet) {
          setWallet(walletResult.value.wallet)
          setError('')
        } else {
          setError(walletResult.reason instanceof Error ? walletResult.reason.message : 'Wallet could not be loaded.')
        }
        if (transactionResult.status === 'fulfilled' && Array.isArray(transactionResult.value?.transactions)) {
          setTransactions(transactionResult.value.transactions)
        } else {
          setHistoryError(
            transactionResult.reason instanceof Error
              ? transactionResult.reason.message
              : 'Wallet activity could not be loaded.',
          )
        }
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [cashAvailable])

  const createPayout = async () => {
    if (!cashAvailable || !withdrawPolicy.authoritative) return
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
    if (!cashAvailable || !withdrawPolicy.authoritative) return
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

  return (
    <AppShell title="RoboCoin (RBC) Wallet" back backTo="/home" avatar={false}>
      <RoboCoinWallet
        rbc={rbc}
        mining={mining}
        ledger={{ wallet, transactions, loading, historyError }}
        loading={miningLoading}
        onWithdraw={openWithdrawal}
        cashAvailable={cashAvailable}
      />
      {error && !wallet && (
        <div className="dw-ledger-error" role="status">
          <span>Wallet unavailable: {error}</span>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}
      {cashAvailable && (
        <details className="dw-payout-controls" ref={payoutPanel} id="withdraw">
          <summary>
            Withdraw & manage payout method
            <DashboardIcon name="chevron" size={18} />
          </summary>
          <div className="dw-payout-content">
            {wallet && (
              <p className="text-body-sm text-on-surface-variant">
                Pending withdrawals: {formatMoney(wallet.pendingWithdrawalMinor, wallet.currency || currency)}
              </p>
            )}

            <section>
              <SectionTitle>Payout method</SectionTitle>
              <Card className="space-y-3 p-card-padding">
                <input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Account name"
                  aria-label="Payout account name"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-on-surface outline-none"
                />
                <input
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
                  placeholder="Account number"
                  inputMode="numeric"
                  aria-label="Payout account number"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-on-surface outline-none"
                />
                <input
                  value={bankCode}
                  onChange={(event) => setBankCode(event.target.value)}
                  placeholder="Provider bank code"
                  aria-label="Payout bank code"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-on-surface outline-none"
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
                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-on-surface outline-none"
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
                  Your identity, bank details and available balance are verified before every withdrawal.
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
          </div>
        </details>
      )}
    </AppShell>
  )
}

export default function Wallet() {
  return <LiveWallet />
}
