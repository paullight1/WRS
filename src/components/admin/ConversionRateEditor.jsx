import { useMemo, useState } from 'react'
import { Badge, Button, Card, Field, Icon, List } from '../ui.jsx'
import { formatMinorUnits } from '../../lib/adminMiningApi.js'

const statusTone = { draft: 'outline', published: 'success', retired: 'outline' }

function toMinorUnits(value) {
  const match = String(value || '').trim().replace(/,/g, '').match(/^(\d+)(?:\.(\d{0,2}))?$/)
  if (!match) return null
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
}

function formatRate(rate) {
  const currency = String(rate.currency || 'USD').toUpperCase()
  return `${formatMinorUnits(100, 'RBC')} = ${formatMinorUnits(Number(rate.rateMinorPerRbcCent || 0) * 100, currency)}`
}

function dateTime(value) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ConversionRateEditor({ rates = [], onCreate, onPublish, busy = '' }) {
  const [form, setForm] = useState({ rbcAmount: '1.00', destinationAmount: '', destinationCurrency: 'NGN', sourceNote: '' })
  const [error, setError] = useState('')
  const [publishId, setPublishId] = useState('')
  const orderedRates = useMemo(() => [...rates].sort((a, b) => new Date(b.createdAt || b.effectiveAt || 0) - new Date(a.createdAt || a.effectiveAt || 0)), [rates])

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submitDraft = async (event) => {
    event.preventDefault()
    const rbcMinorUnits = toMinorUnits(form.rbcAmount)
    const destinationMinorUnits = toMinorUnits(form.destinationAmount)
    if (!rbcMinorUnits || !destinationMinorUnits) return setError('Enter positive RBC and destination amounts with at most two decimal places.')
    if (destinationMinorUnits % rbcMinorUnits !== 0) return setError('Choose values that produce a whole destination-minor-unit rate per RBC cent.')
    setError('')
    try {
      await onCreate?.({
        currency: form.destinationCurrency,
        rateMinorPerRbcCent: destinationMinorUnits / rbcMinorUnits,
        sourceNote: form.sourceNote,
      })
      setForm((current) => ({ ...current, destinationAmount: '', sourceNote: '' }))
    } catch (requestError) { setError(requestError.message || 'Unable to create rate draft.') }
  }

  const publish = async (id) => {
    try { await onPublish?.(id, { confirmed: true }); setPublishId('') } catch (requestError) { setError(requestError.message || 'Unable to publish rate.') }
  }
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]">
      <Card accent="#b07d00" className="p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3b91f]/20 text-[#ffd76d]"><Icon name="price_change" /></span><div><p className="text-label-sm uppercase tracking-[.14em] text-[#ffd76d]">New rate version</p><h2 className="mt-1 font-headline-md text-headline-md text-on-surface">Create a draft</h2></div></div>
        <p className="mt-3 text-body-sm text-on-surface-variant">Rates are versioned. Publishing affects new quotes only; the previously published version is retired automatically.</p>
        <form className="mt-5 space-y-3" onSubmit={submitDraft}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RBC amount" value={form.rbcAmount} onChange={update('rbcAmount')} inputMode="decimal" placeholder="1.00" />
            <Field label="Destination amount" value={form.destinationAmount} onChange={update('destinationAmount')} inputMode="decimal" placeholder="1,532.50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Destination currency" value={form.destinationCurrency} onChange={update('destinationCurrency')} maxLength="3" placeholder="NGN" />
            <div className="rounded-xl border border-white/12 bg-white/[.025] px-3.5 py-3"><p className="text-label-md text-on-surface-variant">Effective time</p><p className="mt-1 text-body-sm text-on-surface">Set when this draft is published</p></div>
          </div>
          <Field label="Source note" value={form.sourceNote} onChange={update('sourceNote')} placeholder="Treasury rate card or approved source" maxLength="500" hint="Required for the audit trail." />
          {error ? <p role="alert" className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" full loading={busy === 'rate-create'} icon="add">Save draft</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6"><div><p className="text-label-sm uppercase tracking-[.14em] text-on-surface-variant">Version history</p><h2 className="mt-1 font-headline-md text-headline-md text-on-surface">Conversion rates</h2></div><Badge t="gold">{orderedRates.length} versions</Badge></div>
        {orderedRates.length === 0 ? <div className="px-5 pb-7 text-body-sm text-on-surface-variant sm:px-6">No rates yet. Create a reviewed draft before any conversion quote can be offered.</div> : <List inset={false}>{orderedRates.map((rate) => {
          const status = String(rate.status || 'draft').toLowerCase()
          return <div key={rate.id} className="px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-title text-on-surface">{formatRate(rate)}</p><Badge t={statusTone[status] || 'outline'}>{status}</Badge></div><p className="mt-1 text-body-sm text-on-surface-variant">Effective {dateTime(rate.effectiveAt)} · {rate.sourceNote || 'No source note provided'}</p>{rate.publishedAt ? <p className="mt-1 text-label-sm text-success">Published {dateTime(rate.publishedAt)}</p> : null}</div>
              {status === 'draft' ? <Button size="sm" variant="tonal" onClick={() => setPublishId(rate.id)} disabled={Boolean(publishId)}>Publish</Button> : null}
            </div>
            {publishId === rate.id ? <div className="mt-3 rounded-xl border border-[#f3b91f]/35 bg-[#f3b91f]/10 p-3"><p className="text-body-sm text-on-surface">Publish this version? New quotes will use this rate; existing quotes will not change.</p><div className="mt-3 flex gap-2"><Button size="sm" loading={busy === `rate-publish-${rate.id}`} onClick={() => publish(rate.id)}>Confirm publish</Button><Button size="sm" variant="quiet" onClick={() => setPublishId('')}>Cancel</Button></div></div> : null}
          </div>
        })}</List>}
      </Card>
    </section>
  )
}
