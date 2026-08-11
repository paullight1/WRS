import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACCENTS, Badge, Button, Card, Icon, IconTile, List, Progress, Row, SectionTitle, Stat } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { activityStatus, miningApi } from '../../lib/miningApi.js'

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const accentFor = (icon) => ({ mic: ACCENTS.violet, image: ACCENTS.green, translate: ACCENTS.orange, verified: ACCENTS.blue, bolt: ACCENTS.violet })[icon] || ACCENTS.teal

function recentActivities(data) {
  return Array.isArray(data?.activities) ? data.activities.slice(0, 4) : []
}

export default function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setError('')
    try { setData(await miningApi.getOverview()) } catch (requestError) { setError(requestError.message) }
  }, [])

  useEffect(() => { load() }, [load])
  const account = data?.account
  const activity = useMemo(() => recentActivities(data), [data])

  if (!data && !error) return <LoadingView title="Loading your mining dashboard" desc="Reading your server-owned contribution and reward status." />
  if (!data) return <StateView live kind="error" title="Mining dashboard unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  const levelTarget = Math.max(1000, Number(account.miningLevel || 1) * 1000)
  const levelProgress = Math.min(100, (Number(account.miningPower || 0) / levelTarget) * 100)
  const summary = data.summary || {}

  return (
    <div className="space-y-5">
      {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button className="text-label-md underline" onClick={load}>Retry</button></div> : null}
      <section className="relative overflow-hidden rounded-3xl border border-[#b995ff]/30 bg-[radial-gradient(circle_at_86%_10%,rgba(185,149,255,.22),transparent_34%),linear-gradient(135deg,#1c163c,#10161f_66%)] p-5 sm:p-7">
        <div className="absolute -right-12 -top-12 grid h-52 w-52 place-items-center rounded-full border border-[#d9caff]/20 text-[#d9caff]/20"><Icon name="currency_bitcoin" fill className="text-[108px]" /></div>
        <div className="relative max-w-xl">
          <p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-[#dfd2ff]"><Icon name="currency_bitcoin" fill /> RobotCoin (RBC)</p>
          <h2 className="mt-3 font-headline-lg text-headline-lg text-white">Contribution that moves you forward.</h2>
          <p className="mt-2 text-body-md text-[#d7d1ea]">Every balance change is connected to a verified WRS contribution.</p>
          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div><p className="text-label-sm text-[#bdb5d3]">Available balance</p><p className="tnum mt-1 font-headline-lg text-headline-lg text-white">{money(account.availableRbc)} <span className="text-title text-[#d8c6ff]">RBC</span></p><p className="text-label-sm text-[#bdb5d3]">Ready to use in WRS</p></div>
            <div className="h-10 w-px bg-white/15" />
            <div><p className="text-label-sm text-[#bdb5d3]">Mining status</p><p className="mt-1 flex items-center gap-2 text-title text-white"><span className="h-2.5 w-2.5 rounded-full bg-success" />Active</p><p className="text-label-sm text-[#bdb5d3]">{account.streakDays || 0} day streak</p></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Earned today" value={`${money(summary.earnedTodayRbc)} RBC`} t="success" icon="trending_up" />
        <Stat label="Pending rewards" value={`${money(account.pendingRbc)} RBC`} t="gold" icon="schedule" />
        <Stat label="Total earned" value={`${money(account.totalEarnedRbc)} RBC`} t="secondary" icon="workspace_premium" />
        <Stat label="Verified tasks" value={String(summary.tasksCompleted || account.approvedTasks || 0)} t="primary" icon="task_alt" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-label-sm text-on-surface-variant">Mining power</p><p className="tnum mt-1 font-headline-lg text-headline-lg text-on-surface">{Number(account.miningPower || 0).toLocaleString()} <span className="text-label-md text-on-surface-variant">MP</span></p></div><Badge t="tertiary">Level {account.miningLevel || 1}</Badge></div>
          <div className="mt-5"><div className="mb-2 flex justify-between text-label-sm"><span className="text-on-surface-variant">Progress to next level</span><span className="tnum text-on-surface">{Math.round(levelProgress)}%</span></div><Progress value={levelProgress} height="h-2.5" color="bg-gradient-to-r from-[#f3b91f] to-[#00dbe7]" label="Mining level progress" /><p className="mt-3 text-body-sm text-on-surface-variant">Mining power only increases after a server verifies a contribution.</p></div>
          <Button to="/mining/power" variant="ghost" className="mt-5" trailingIcon="arrow_forward">View mining power</Button>
        </Card>
        <Card className="p-5"><SectionTitle action="Open missions" to="/mining/missions">Today’s next step</SectionTitle><p className="text-body-md text-on-surface">Complete a contribution, then claim only rewards the server marks eligible.</p><div className="mt-5 grid gap-2"><Button to="/mining/missions" full icon="flag">View daily missions</Button><Button to="/mining/event-code" full variant="ghost" icon="confirmation_number">Redeem event code</Button></div></Card>
      </section>

      <section><SectionTitle action="View all" to="/mining/activity">Recent activity</SectionTitle>{activity.length ? <List>{activity.map((item) => { const status = activityStatus(item.status); const amount = Number(item.rewardRbc || 0); return <Row key={item.id} icon={item.icon || 'task_alt'} accent={accentFor(item.icon)} title={item.title || 'Contribution recorded'} subtitle={`${item.detail || 'Server reward record'}${item.sourceId ? ` · Source ${item.sourceId}` : ''}`} value={`${amount >= 0 ? '+' : ''}${money(amount)} RBC`} meta={<Badge t={status.tone}>{status.label}</Badge>} /> })}</List> : <Card><StateView kind="empty" title="No mining activity yet" desc="Complete a verified contribution or redeem an eligible event code to start your record." action={<Button to="/mining/missions">Explore missions</Button>} /></Card>}</section>
      <p className="text-center text-body-sm text-on-surface-variant"><Link className="text-primary hover:underline" to="/mining/analytics">See your mining analytics</Link> · Account rewards are traceable to their source.</p>
    </div>
  )
}
