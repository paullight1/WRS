import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Icon, List, Row, SectionTitle, Tabs } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import ConversionQuote from '../../components/mining/ConversionQuote.jsx'
import WithdrawalForm from '../../components/mining/WithdrawalForm.jsx'
import { formatRbcCents, isUnavailableConversionRate, maskBankAccount, miningApi, walletTabs, withdrawalStatusPresentation } from '../../lib/miningApi.js'

function money(value, currency = 'USD') {
  return `${String(currency).toUpperCase()} ${(Number(value || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function listOf(value, key) {
  if (Array.isArray(value)) return value
  return Array.isArray(value?.[key]) ? value[key] : []
}

export default function Wallet() {
  const [data, setData] = useState(null)
  const [quote, setQuote] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [wallet, rate, withdrawals, transactions] = await Promise.all([
        miningApi.getWallet(), miningApi.getConversionRate().catch((requestError) => {
          if (isUnavailableConversionRate(requestError)) return null
          throw requestError
        }), miningApi.getWithdrawals(), miningApi.getTransactions(),
      ])
      setData({ wallet, rate, withdrawals: listOf(withdrawals, 'withdrawals'), transactions: listOf(transactions, 'transactions') })
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your RBC wallet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <LoadingView title="Loading your RBC wallet" desc="Reading server-owned balances, rates, and withdrawal requests." />
  if (!data) return <StateView live kind="error" title="RBC wallet unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  const { wallet, rate, withdrawals, transactions } = data
  const available = Number(wallet?.availableRbcCents || 0)
  const pending = Number(wallet?.pendingRbcCents || 0)
  const walletCurrency = wallet?.currency || 'USD'

  return (
    <div className="space-y-5">
      {error ? <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button className="text-label-md underline" onClick={load}>Retry</button></div> : null}
      <section className="relative overflow-hidden rounded-3xl border border-[#f3b91f]/30 bg-[radial-gradient(circle_at_88%_5%,rgba(185,149,255,.2),transparent_35%),linear-gradient(135deg,#21172f,#10161f_70%)] p-5 sm:p-7"><Icon name="account_balance_wallet" fill className="absolute -right-3 -top-5 text-[150px] text-[#f3b91f]/10" /><div className="relative"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-[#f7c948]"><Icon name="currency_bitcoin" fill /> RBC wallet</p><h1 className="mt-3 font-headline-lg text-headline-lg text-white">Your contribution balance, clearly accounted for.</h1><div className="mt-6 grid max-w-xl grid-cols-2 gap-4"><div><p className="text-label-sm text-[#c9c1da]">Available RBC</p><p className="tnum mt-1 font-headline-lg text-headline-lg text-white">{formatRbcCents(available)}</p><p className="text-label-sm text-[#c9c1da]">Eligible for requests</p></div><div><p className="text-label-sm text-[#c9c1da]">Pending RBC</p><p className="tnum mt-1 font-headline-lg text-headline-lg text-white">{formatRbcCents(pending)}</p><p className="text-label-sm text-[#c9c1da]">Awaiting verification</p></div></div></div></section>
      <Tabs items={walletTabs()} value={tab} onChange={setTab} />

      {tab === 'Overview' ? <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]"><ConversionQuote wallet={wallet} rate={rate} onCreateQuote={(input) => miningApi.createConversionQuote(input, crypto.randomUUID())} onQuote={setQuote} /><WithdrawalForm wallet={wallet} quote={quote} onSubmit={(input) => miningApi.createWithdrawal(input, crypto.randomUUID())} onSubmitted={load} /></div> : null}
      {tab === 'Withdrawals' ? <section><SectionTitle action={`${withdrawals.length} requests`}>Withdrawal status</SectionTitle>{withdrawals.length ? <List>{withdrawals.map((request) => { const status = withdrawalStatusPresentation(request.status); const bank = request.bank || {}; const account = bank.accountNumber || request.maskedAccountNumber || request.maskedAccount || maskBankAccount(request.accountNumber); return <Row key={request.id} icon="account_balance" t={status.tone} title={`${formatRbcCents(request.amountRbcCents)} · ${request.currency || walletCurrency}`} subtitle={`${bank.name || request.bankName || 'Bank account'} · ${account}`} meta={<Badge t={status.tone}>{status.label}</Badge>}><span className="mt-1 block text-label-sm text-on-surface-variant">{status.detail}{request.rejectionReason ? ` Reason: ${request.rejectionReason}` : ''}</span></Row> })}</List> : <Card><StateView kind="empty" title="No withdrawal requests" desc="Submit a request after reviewing the conversion rate. Bank payouts are reviewed manually." /></Card>}</section> : null}
      {tab === 'History' ? <section><SectionTitle action={`${transactions.length} entries`}>RBC transaction history</SectionTitle>{transactions.length ? <List>{transactions.map((entry) => { const amount = Number(entry.amountRbcCents ?? entry.rbcAmountCents ?? 0); const positive = amount >= 0; return <Row key={entry.id} icon={positive ? 'south_west' : 'north_east'} t={positive ? 'success' : 'outline'} title={entry.description || entry.type || 'RBC activity'} subtitle={`${entry.status || 'Recorded'} · ${entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Server record'}`} value={`${positive ? '+' : ''}${formatRbcCents(amount)}`} /> })}</List> : <Card><StateView kind="empty" title="No RBC transactions yet" desc="Verified earning, boost, conversion, and withdrawal records will appear here." /></Card>}</section> : null}
      <p className="text-center text-body-sm text-on-surface-variant">Estimated conversion values are snapshots. A withdrawal shows as paid only after an administrator records a completed bank payout.</p>
    </div>
  )
}
