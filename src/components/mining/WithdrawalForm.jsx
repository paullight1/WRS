import { useEffect, useState } from 'react'
import { Button, Card, Field, Icon } from '../ui.jsx'
import { formatRbcCents, validateWithdrawalRequest, withdrawalPayload } from '../../lib/miningApi.js'

const emptyForm = { bankCountry: '', bankName: '', accountName: '', accountNumber: '', amount: '', currency: '', quoteId: '', confirmed: false }

export default function WithdrawalForm({ wallet, quote, onSubmit, onSubmitted }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!quote?.id) return
    setForm((current) => ({
      ...current,
      quoteId: quote.id,
      amount: (Number(quote.amountRbcCents || 0) / 100).toFixed(2),
      currency: String(quote.currency || '').toUpperCase(),
    }))
    setErrors((current) => ({ ...current, quoteId: undefined, amount: undefined, currency: undefined }))
  }, [quote?.id, quote?.amountRbcCents, quote?.currency])

  const update = (field) => (event) => {
    const value = field === 'confirmed' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setNotice('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = validateWithdrawalRequest(form, wallet)
    if (Object.keys(found).length) { setErrors(found); return }

    setBusy(true); setNotice('')
    try {
      const result = await onSubmit(withdrawalPayload(form, quote))
      const withdrawal = result?.withdrawal || result
      setNotice('Withdrawal request submitted. An administrator will review it before any bank payout is made.')
      setForm(emptyForm)
      onSubmitted?.(withdrawal)
    } catch (requestError) {
      setErrors({ form: requestError.message || 'Unable to submit this withdrawal request.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Icon name="account_balance" fill /></span><div><h2 className="font-headline-md text-headline-md text-on-surface">Request a bank withdrawal</h2><p className="mt-1 text-body-sm text-on-surface-variant">Available RBC: {formatRbcCents(wallet?.availableRbcCents)}. Bank payouts are reviewed manually.</p></div></div>
      <form className="mt-5 space-y-3" onSubmit={submit} noValidate>
        {quote?.id ? <p className="rounded-xl border border-[#f3b91f]/25 bg-[#f3b91f]/[.06] px-3.5 py-3 text-body-sm text-on-surface-variant">Using quote {quote.id.slice(0, 8)} · {formatRbcCents(quote.amountRbcCents)} → {quote.currency}</p> : <p className="rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-3 text-body-sm text-on-surface-variant">Get a current conversion quote first. The quoted amount and currency are locked into your withdrawal request.</p>}
        {errors.quoteId ? <p className="text-label-sm text-error">{errors.quoteId}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Bank country" autoComplete="country" autoCapitalize="characters" maxLength="2" value={form.bankCountry} onChange={update('bankCountry')} error={errors.bankCountry} hint="Two-letter ISO code, for example NG." placeholder="NG" /><Field label="Bank name" autoComplete="organization" value={form.bankName} onChange={update('bankName')} error={errors.bankName} placeholder="Bank name" /></div>
        <Field label="Account holder name" autoComplete="name" value={form.accountName} onChange={update('accountName')} error={errors.accountName} placeholder="Name on the bank account" />
        <Field label="Account number or IBAN" autoComplete="off" value={form.accountNumber} onChange={update('accountNumber')} error={errors.accountNumber} placeholder="Account number or IBAN" />
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Quoted RBC amount" inputMode="decimal" value={form.amount} error={errors.amount} placeholder="Get a quote first" disabled /><Field label="Quoted destination currency" value={form.currency} error={errors.currency} placeholder="Get a quote first" disabled /></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3.5"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={form.confirmed} onChange={update('confirmed')} /><span><span className="block text-body-sm text-on-surface">I confirm these bank details are correct and belong to me.</span><span className="mt-1 block text-label-sm text-on-surface-variant">Submitting creates a request for review. It does not initiate an automatic bank transfer.</span>{errors.confirmed ? <span className="mt-1 block text-label-sm text-error">{errors.confirmed}</span> : null}</span></label>
        {errors.form ? <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-3 text-body-sm text-error">{errors.form}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-3.5 py-3 text-body-sm text-success">{notice}</p> : null}
        <Button full loading={busy} disabled={!quote?.id} icon="request_quote">Submit withdrawal request</Button>
      </form>
    </Card>
  )
}
