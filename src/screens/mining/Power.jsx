import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, DataRow, Icon, Progress, SectionTitle, Stat } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { miningApi } from '../../lib/miningApi.js'

const whole = (value) => Number(value || 0).toLocaleString()

export default function Power() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { setError(''); try { setData(await miningApi.getPower()) } catch (requestError) { setError(requestError.message) } }, [])
  useEffect(() => { load() }, [load])

  if (!data && !error) return <LoadingView title="Loading mining power" desc="Checking your verified contribution level and active multipliers." />
  if (!data) return <StateView live kind="error" title="Mining power unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  const account = data.account || data
  const power = Number(account.miningPower || 0)
  const level = Math.max(1, Number(account.miningLevel || 1))
  const target = Number(data.nextLevelTarget || level * 1000)
  const progress = Math.min(100, (power / Math.max(target, 1)) * 100)
  const boosts = data.activeBoosts || data.boosts?.filter((boost) => boost.active) || []
  const ways = data.increasePower || [
    { icon: 'model_training', title: 'Train your robot', detail: 'Complete verified learning modules.' },
    { icon: 'dataset', title: 'Submit quality data', detail: 'Contributions only count after review.' },
    { icon: 'verified', title: 'Validate data', detail: 'Build accuracy through completed validation work.' },
  ]

  return <div className="space-y-5">
    {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button className="text-label-md underline" onClick={load}>Retry</button></div> : null}
    <section className="relative overflow-hidden rounded-3xl border border-tertiary/35 bg-[radial-gradient(circle_at_86%_20%,rgba(0,219,231,.16),transparent_28%),linear-gradient(135deg,#102934,#11161e_68%)] p-6"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-tertiary"><Icon name="bolt" fill /> Mining power</p><div className="mt-5 grid items-center gap-6 sm:grid-cols-[auto_1fr]"><div className="grid h-36 w-36 place-items-center rounded-full border-[10px] border-tertiary/30 bg-surface-container-high text-center shadow-[0_0_36px_rgba(0,219,231,.12)]"><div><p className="tnum font-headline-lg text-headline-lg text-on-surface">{whole(power)}</p><p className="text-label-sm text-tertiary">MP</p></div></div><div><div className="flex items-center gap-2"><Badge t="tertiary">Level {level}</Badge><span className="text-body-sm text-on-surface-variant">Verified contributor</span></div><h2 className="mt-3 font-headline-lg text-headline-lg text-on-surface">Build power through proof of contribution.</h2><p className="mt-2 text-body-md text-on-surface-variant">Power is never estimated by this screen; it updates only after WRS accepts a contribution.</p><div className="mt-4"><div className="mb-2 flex justify-between text-label-sm"><span className="text-on-surface-variant">Next level</span><span className="tnum text-on-surface">{whole(power)} / {whole(target)} MP</span></div><Progress value={progress} height="h-2.5" color="bg-gradient-to-r from-[#00dbe7] to-[#f3b91f]" label="Progress to next mining level" /></div></div></div></section>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Mining level" value={`Level ${level}`} t="tertiary" icon="military_tech" /><Stat label="Efficiency" value={`${Number(data.contributionEfficiency ?? data.efficiency ?? 0)}%`} t="success" icon="speed" /><Stat label="Current streak" value={`${Number(account.streakDays || 0)} days`} t="gold" icon="local_fire_department" /><Stat label="Multiplier" value={`${Number(data.multiplier || 1).toFixed(2)}×`} t="secondary" icon="auto_awesome" /></section>
    <section><SectionTitle action="Manage" to="/mining/boosts">Active boosts</SectionTitle>{boosts.length ? <Card className="divide-hairline">{boosts.map((boost) => <DataRow key={boost.id || boost.boostId} label={boost.label || boost.name || 'Active boost'} value={boost.detail || `${boost.durationHours || 0}h boost`} meta={boost.activeUntil ? `Until ${new Date(boost.activeUntil).toLocaleString()}` : 'Active'} />)}</Card> : <Card className="p-5"><p className="text-title text-on-surface">No active boosts</p><p className="mt-1 text-body-sm text-on-surface-variant">Activate a boost with available RBC after the server confirms its cost.</p><Button to="/mining/boosts" variant="ghost" className="mt-4">Explore boosts</Button></Card>}</section>
    <section><SectionTitle>Increase your mining power</SectionTitle><div className="grid gap-3 md:grid-cols-3">{ways.map((item) => <Card key={item.title} className="p-5"><Icon name={item.icon || 'task_alt'} className="text-[28px] text-tertiary" /><h3 className="mt-4 text-title text-on-surface">{item.title}</h3><p className="mt-1 text-body-sm text-on-surface-variant">{item.detail}</p></Card>)}</div></section>
  </div>
}
