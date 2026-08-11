import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Icon, List, Row, Tabs } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { leaderboardCategories, miningApi } from '../../lib/miningApi.js'

const labels = { miners: 'Miners', contributors: 'Contributors', validators: 'Validators', ambassadors: 'Ambassadors', referrers: 'Referrers', cities: 'Cities', countries: 'Countries' }
const tabItems = leaderboardCategories.map((category) => labels[category])
const categoryFromLabel = (label) => leaderboardCategories.find((category) => labels[category] === label) || 'miners'
const rowsFrom = (data) => Array.isArray(data) ? data : data?.entries || data?.leaderboard || data?.items || []
const amount = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function Leaderboard() {
  const [tab, setTab] = useState('Miners')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const category = categoryFromLabel(tab)
  const load = useCallback(async () => { setError(''); try { setData(await miningApi.getLeaderboard(category)) } catch (requestError) { setError(requestError.message) } }, [category])
  useEffect(() => { setData(null); load() }, [load])
  if (!data && !error) return <LoadingView title="Loading leaderboard" desc="Reading the selected server-ranked contribution category." />
  if (!data) return <StateView live kind="error" title="Leaderboard unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />
  const rows = rowsFrom(data)
  return <div className="space-y-5">
    <section className="rounded-3xl border border-secondary/30 bg-[linear-gradient(135deg,rgba(139,47,214,.2),rgba(18,22,31,.96)_60%)] p-5 sm:p-7"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-secondary"><Icon name="leaderboard" fill /> Leaderboards</p><h2 className="mt-2 font-headline-lg text-headline-lg text-on-surface">Recognition for verified contribution.</h2><p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Each view is scoped to one ranking category. Rankings do not change account balances or create rewards.</p></section>
    <Tabs items={tabItems} value={tab} onChange={setTab} className="overflow-x-auto" />
    {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button onClick={load} className="text-label-md underline">Retry</button></div> : null}
    {rows.length ? <List>{rows.map((entry, index) => { const rank = Number(entry.rank || index + 1); const name = entry.name || entry.label || entry.profile?.name || 'WRS member'; const metric = entry.value ?? entry.score ?? entry.rbc ?? entry.miningPower ?? 0; const suffix = entry.unit || (category === 'miners' ? 'RBC' : category === 'cities' || category === 'countries' ? 'contributors' : 'points'); return <Row key={entry.id || `${name}-${rank}`} iconNode={<span className={`grid h-10 w-10 place-items-center rounded-xl text-title ${rank <= 3 ? 'bg-[#f3b91f]/20 text-[#f7c948]' : 'bg-white/[.06] text-on-surface-variant'}`}>#{rank}</span>} title={name} subtitle={[entry.robotName, entry.country, entry.city].filter(Boolean).join(' · ') || 'Verified WRS contributor'} value={`${amount(metric)} ${suffix}`} meta={entry.isCurrentUser ? <Badge t="tertiary">You</Badge> : undefined} /> })}</List> : <Card><StateView kind="empty" title={`No ${labels[category].toLowerCase()} ranking yet`} desc="This category will populate after WRS has verified enough contribution records to rank." action={<Button icon="refresh" onClick={load}>Check again</Button>} /></Card>}
  </div>
}
