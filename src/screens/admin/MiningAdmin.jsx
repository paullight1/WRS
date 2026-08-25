import { useCallback, useEffect, useMemo, useState } from 'react'
import ConversionRateEditor from '../../components/admin/ConversionRateEditor.jsx'
import WithdrawalReviewTable from '../../components/admin/WithdrawalReviewTable.jsx'
import { Badge, Button, Card, Icon, List, SkeletonRows } from '../../components/ui.jsx'
import {
  adminMiningApi,
  formatAuditRow,
} from '../../lib/adminMiningApi.js'

function asList(payload, names) {
  if (Array.isArray(payload)) return payload
  for (const name of names) if (Array.isArray(payload?.[name])) return payload[name]
  return []
}

function formatTimestamp(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function reviewStats(withdrawals, overview) {
  const count = (status) => withdrawals.filter((item) => String(item.status || '').toLowerCase() === status).length
  return [
    ['Pending review', overview?.withdrawals?.pending ?? count('pending'), '#f3b91f', 'schedule'],
    ['Approved', overview?.withdrawals?.approved ?? count('approved'), '#00dbe7', 'verified'],
    ['Paid', overview?.withdrawals?.paid ?? count('paid'), '#3ddc97', 'task_alt'],
    ['Published rates', overview?.publishedRates?.length ?? 0, '#b995ff', 'price_change'],
  ]
}

export default function MiningAdmin() {
  const [overview, setOverview] = useState(null)
  const [rates, setRates] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setDenied(false)
    try {
      const [nextOverview, nextRates, nextWithdrawals, nextAudit] = await Promise.all([
        adminMiningApi.getOverview(),
        adminMiningApi.listConversionRates(),
        adminMiningApi.listWithdrawals(),
        adminMiningApi.listAudit(),
      ])
      setOverview(nextOverview || {})
      setRates(asList(nextRates, ['rates', 'items', 'conversionRates']))
      setWithdrawals(asList(nextWithdrawals, ['withdrawals', 'items']))
      setAudit(asList(nextAudit, ['events', 'audit', 'items']))
    } catch (requestError) {
      if (requestError?.status === 403) setDenied(true)
      else setError(requestError?.message || 'Unable to load mining administration.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!notice) return undefined
    const timeout = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(timeout)
  }, [notice])

  const perform = async (key, task, successMessage) => {
    setBusy(key); setError('')
    try { await task(); await load(); setNotice(successMessage) } catch (requestError) { setError(requestError.message || 'Unable to complete the admin action.'); throw requestError } finally { setBusy('') }
  }

  const auditRows = useMemo(() => audit.map(formatAuditRow), [audit])
  const stats = useMemo(() => reviewStats(withdrawals, overview), [withdrawals, overview])

  if (denied) return <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12"><Card accent="#dc3a3f" className="w-full p-7 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-error/15 text-error"><Icon name="admin_panel_settings" size={28} /></span><h1 className="mt-4 font-headline-lg text-headline-lg text-on-surface">Mining administration is restricted</h1><p className="mt-2 text-body-md text-on-surface-variant">This control plane requires a trusted platform or tenant administrator role. Member accounts cannot review payouts or change conversion rates.</p><Button className="mt-6" variant="ghost" onClick={load}>Try again</Button></Card></main>

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#b995ff]/25 bg-[radial-gradient(circle_at_94%_12%,rgba(185,149,255,.18),transparent_28%),linear-gradient(115deg,#19142d,#11171d_58%,#101317)] px-5 py-6 sm:px-7 sm:py-8"><div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border border-[#b995ff]/15" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-label-sm uppercase tracking-[.16em] text-[#d8c6ff]"><Icon name="shield" size={18} />Admin control plane</div><h1 className="mt-3 max-w-2xl font-headline-lg text-headline-lg text-white">RobotCoin settlement controls</h1><p className="mt-2 max-w-2xl text-body-md text-[#cbc6df]">Publish accountable conversion rates and record human-reviewed bank payouts with a durable audit trail.</p></div><Button variant="ghost" icon="refresh" loading={loading} onClick={load}>Refresh</Button></div></section>

      {error ? <div role="alert" className="flex items-center gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3"><Icon name="error" className="text-error" /><p className="flex-1 text-body-sm text-error">{error}</p><button className="text-label-sm text-error underline" onClick={load}>Retry</button></div> : null}
      {notice ? <div role="status" className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3"><Icon name="check_circle" className="text-success" /><p className="text-body-sm text-success">{notice}</p></div> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([label, value, color, icon]) => <Card key={label} className="p-4" style={{ borderTop: `2px solid ${color}` }}><Icon name={icon} className="text-[20px]" style={{ color }} /><p className="tnum mt-3 font-headline-md text-headline-md text-on-surface">{loading ? '—' : value}</p><p className="mt-1 text-label-sm text-on-surface-variant">{label}</p></Card>)}</section>

      {loading ? <section className="grid gap-4 xl:grid-cols-2"><Card className="p-5"><SkeletonRows rows={4} /></Card><Card className="p-5"><SkeletonRows rows={4} /></Card></section> : <>
        <ConversionRateEditor
          rates={rates}
          busy={busy}
          onCreate={(input) => perform('rate-create', () => adminMiningApi.createConversionRate(input), 'Conversion rate draft created.')}
          onPublish={(id, input) => perform(`rate-publish-${id}`, () => adminMiningApi.publishConversionRate(id, input), 'Conversion rate published for new quotes.')}
        />
        <WithdrawalReviewTable
          withdrawals={withdrawals}
          busy={busy}
          onApprove={(id, input) => perform(`approve-${id}`, () => adminMiningApi.approveWithdrawal(id, input), 'Withdrawal review approved. No bank payout has been initiated.')}
          onReject={(id, input) => perform(`reject-${id}`, () => adminMiningApi.rejectWithdrawal(id, input), 'Withdrawal request rejected with the recorded reason.')}
          onMarkPaid={(id, input) => perform(`paid-${id}`, () => adminMiningApi.markWithdrawalPaid(id, input), 'External bank payout recorded as paid.')}
        />
        <Card className="overflow-hidden p-0"><div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6"><div><p className="text-label-sm uppercase tracking-[.14em] text-on-surface-variant">Evidence ledger</p><h2 className="mt-1 font-headline-md text-headline-md text-on-surface">Mining audit trail</h2></div><Badge t="tertiary">{auditRows.length} events</Badge></div>{auditRows.length === 0 ? <div className="px-5 pb-7 text-body-sm text-on-surface-variant sm:px-6">No mining admin actions have been recorded yet.</div> : <List inset={false}>{auditRows.map((row) => <div key={row.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-title-sm text-on-surface">{row.action}</p><Badge t="outline">{row.actorRole}</Badge></div><p className="mt-1 text-body-sm text-on-surface-variant">{row.actor} · {formatTimestamp(row.occurredAt)} · Request {row.requestId || '—'}</p>{row.account ? <p className="mt-1 truncate text-label-sm text-on-surface-variant">{row.account}</p> : null}</div><div className="min-w-0 text-left sm:max-w-xs sm:text-right"><p className="text-label-sm text-on-surface-variant">{row.reason || 'No reason recorded'}</p>{row.payoutReference ? <p className="mt-1 tnum text-label-sm text-success">Payout ref · {row.payoutReference}</p> : null}</div></div>)}</List>}</Card>
      </>}
    </main>
  )
}
