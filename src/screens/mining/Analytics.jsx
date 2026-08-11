import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, DataRow, Icon, SectionTitle, Tabs } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { miningApi } from '../../lib/miningApi.js'

const periods = { Day: 'day', Month: 'month', All: 'all' }
const number = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

function valuesFrom(data) {
  const series = data?.earnings || data?.series || data?.points || []
  return Array.isArray(series) ? series.map((item) => ({ label: item.date || item.label || '', value: Number(item.rbc ?? item.value ?? 0) })) : []
}

function EarningsChart({ values, label }) {
  const safe = values.length ? values : [{ value: 0 }]
  const max = Math.max(1, ...safe.map((item) => item.value))
  const width = 560
  const height = 180
  const step = width / Math.max(1, safe.length - 1)
  const points = safe.map((item, index) => `${Math.round(index * step)},${Math.round(height - 20 - (item.value / max) * 132)}`).join(' ')
  return <div className="overflow-x-auto"><svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} className="min-w-[460px] w-full" preserveAspectRatio="none"><defs><linearGradient id="analytics-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f3b91f" stopOpacity=".32" /><stop offset="1" stopColor="#f3b91f" stopOpacity="0" /></linearGradient></defs>{[40, 80, 120, 160].map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} stroke="rgba(255,255,255,.08)" />)}<polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#analytics-area)" /><polyline points={points} fill="none" stroke="#f7c948" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
}

export default function Analytics() {
  const [tab, setTab] = useState('Day')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { setError(''); try { setData(await miningApi.getAnalytics(periods[tab])) } catch (requestError) { setError(requestError.message) } }, [tab])
  useEffect(() => { setData(null); load() }, [load])
  const values = useMemo(() => valuesFrom(data), [data])

  if (!data && !error) return <LoadingView title="Loading analytics" desc="Calculating only the mining data available for this period." />
  if (!data) return <StateView live kind="error" title="Analytics unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  const total = values.reduce((sum, item) => sum + item.value, 0)
  const stats = data.statistics || data.stats || {}
  return <div className="space-y-5">
    <section className="rounded-3xl border border-[#f3b91f]/30 bg-[linear-gradient(135deg,rgba(176,125,0,.18),rgba(18,22,31,.95)_60%)] p-5 sm:p-7"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-[#f7c948]"><Icon name="insights" fill /> Mining analytics</p><h2 className="mt-2 font-headline-lg text-headline-lg text-on-surface">A record of verified progress.</h2><p className="mt-2 text-body-md text-on-surface-variant">Charts are calculated from server-provided RBC activity, never projected earnings.</p></section>
    <Tabs items={Object.keys(periods)} value={tab} onChange={setTab} />
    {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button className="text-label-md underline" onClick={load}>Retry</button></div> : null}
    <Card className="p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-label-sm text-on-surface-variant">RobotCoin earned</p><p className="tnum mt-1 font-headline-lg text-headline-lg text-on-surface">{number(data.totalRbc ?? total)} <span className="text-label-md text-[#f7c948]">RBC</span></p></div><p className="text-body-sm text-on-surface-variant">{values.length} recorded intervals</p></div><div className="mt-6"><EarningsChart values={values} label={`${tab} RobotCoin earnings chart`} /></div></Card>
    <section className="grid gap-4 lg:grid-cols-2"><Card><SectionTitle>Contribution statistics</SectionTitle><div className="divide-hairline"><DataRow label="Tasks completed" value={number(stats.tasksCompleted ?? data.tasksCompleted)} /><DataRow label="Success rate" value={`${number(stats.successRate ?? data.successRate)}%`} /><DataRow label="Contribution accuracy" value={`${number(stats.contributionAccuracy ?? data.contributionAccuracy)}%`} /><DataRow label="Mining hours" value={number(stats.miningHours ?? data.miningHours)} /></div></Card><Card><SectionTitle>Earnings sources</SectionTitle>{(data.breakdown || []).length ? <div className="divide-hairline">{data.breakdown.map((item) => <DataRow key={item.source || item.label} label={item.source || item.label} value={`${number(item.rbc ?? item.value)} RBC`} meta={item.percent !== undefined ? `${number(item.percent)}%` : undefined} />)}</div> : <StateView kind="empty" title="No earnings breakdown yet" desc="Sources will appear when verified reward activity exists for this period." />}</Card></section>
  </div>
}
