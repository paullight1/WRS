import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Field, Icon } from '../ui.jsx'
import { buildConversionQuoteSnapshot, formatRbcCents } from '../../lib/miningApi.js'

function currenciesFor(rate) {
  const values = Array.isArray(rate?.destinationCurrencies)
    ? rate.destinationCurrencies
    : [rate?.destinationCurrency || rate?.currency]
  return [...new Set(values.filter(Boolean).map((value) => String(value).toUpperCase()))]
}

export default function ConversionQuote({ wallet, rate, onCreateQuote, onQuote }) {
  const currencies = useMemo(() => currenciesFor(rate), [rate])
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!currencies.includes(currency)) setCurrency(currencies[0] || '')
  }, [currencies, currency])

  const requestQuote = async (event) => {
    event.preventDefault()
    const normalized = String(amount).trim()
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
      setError('Enter a conversion amount greater than 0 RBC.')
      return
    }
    if (!currency) {
      setError('No destination currency is published for this conversion rate.')
      return
    }

    setBusy(true); setError(''); setQuote(null)
    try {
      const [whole, fraction = ''] = normalized.split('.')
      const amountRbcCents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
      const result = await onCreateQuote({ amountRbcCents, currency })
      const nextQuote = result?.quote || result
      setQuote(nextQuote)
      onQuote?.(nextQuote)
    } catch (requestError) {
      setError(requestError.message || 'Unable to create a conversion quote.')
    } finally {
      setBusy(false)
    }
  }

  const snapshot = quote ? buildConversionQuoteSnapshot(quote) : null
  const rateVersion = rate?.version || rate?.rateVersion || rate?.id

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3b91f]/15 text-[#f7c948]"><Icon name="currency_exchange" fill /></span>
        <div className="min-w-0 flex-1"><h2 className="font-headline-md text-headline-md text-on-surface">Conversion quote</h2><p className="mt-1 text-body-sm text-on-surface-variant">Review an admin-published rate before you request a manual withdrawal.</p></div>
      </div>

      {rate ? <div className="mt-4 flex flex-wrap items-center gap-2"><Badge t="gold">Published rate</Badge>{rateVersion ? <span className="text-label-sm text-on-surface-variant">Version {rateVersion}</span> : null}{rate.sourceNote ? <span className="text-label-sm text-on-surface-variant">· {rate.sourceNote}</span> : null}</div> : <p className="mt-4 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-3 text-body-sm text-on-surface-variant">No conversion rate is currently published. Check back after an administrator publishes one.</p>}

      <form className="mt-5 space-y-3" onSubmit={requestQuote}>
        <Field label="RBC amount" icon="currency_bitcoin" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={!rate || busy} hint={`Available: ${formatRbcCents(wallet?.availableRbcCents)}`} error={error} />
        <label className="block"><span className="mb-1.5 block text-label-md text-on-surface-variant">Destination currency</span><select className="min-h-[48px] w-full rounded-xl border border-white/12 bg-surface-container px-3.5 text-body-md text-on-surface outline-none focus:border-primary disabled:opacity-50" value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={!rate || busy || !currencies.length}><option value="">Choose currency</option>{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <Button full variant="tertiary" loading={busy} disabled={!rate || !currencies.length} icon="calculate">Get conversion quote</Button>
      </form>

      {snapshot ? <div className="mt-5 rounded-xl border border-[#f3b91f]/25 bg-[#f3b91f]/[.06] p-4"><div className="flex items-center justify-between gap-4"><span className="text-label-sm text-on-surface-variant">You convert</span><span className="tnum text-title text-on-surface">{snapshot.source}</span></div><div className="mt-2 flex items-center justify-between gap-4"><span className="text-label-sm text-on-surface-variant">Estimated destination amount</span><span className="tnum text-title text-[#f7c948]">{snapshot.destination}</span></div><div className="mt-2 flex items-center justify-between gap-4"><span className="text-label-sm text-on-surface-variant">Fee</span><span className="tnum text-label-md text-on-surface">{snapshot.fee}</span></div><p className="mt-3 text-label-sm text-on-surface-variant">Rate snapshot {snapshot.rateVersion}{snapshot.expiresAt ? ` · expires ${new Date(snapshot.expiresAt).toLocaleString()}` : ''}</p><p className="mt-3 text-body-sm text-on-surface-variant">This is a quote only. It does not convert RBC or send money to a bank account.</p></div> : null}
    </Card>
  )
}
