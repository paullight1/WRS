import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Icon, IconTile, SectionTitle } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { miningApi } from '../../lib/miningApi.js'

const price = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const accents = { bolt: '#8b2fd6', psychology: '#b07d00', verified: '#128b57' }
const boostList = (data) => Array.isArray(data) ? data : data?.boosts || data?.items || []

export default function Boosts() {
  const [boosts, setBoosts] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => { setError(''); try { setBoosts(boostList(await miningApi.getBoosts())) } catch (requestError) { setError(requestError.message) } }, [])
  useEffect(() => { load() }, [load])
  const activate = async (boost, extend = false) => { setBusy(boost.id); setError(''); try { if (extend) await miningApi.extendBoost(boost.id); else await miningApi.activateBoost(boost.id); await load() } catch (requestError) { setError(requestError.message) } finally { setBusy('') } }

  if (!boosts && !error) return <LoadingView title="Loading boosts" desc="Checking available RBC and currently active boost effects." />
  if (!boosts) return <StateView live kind="error" title="Boosts unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  return <div className="space-y-5">
    <section className="rounded-3xl border border-secondary/35 bg-[radial-gradient(circle_at_85%_20%,rgba(139,47,214,.23),transparent_30%),linear-gradient(135deg,#211239,#11161e_64%)] p-5 sm:p-7"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-secondary"><Icon name="rocket_launch" fill /> Robot boosts</p><h2 className="mt-2 font-headline-lg text-headline-lg text-on-surface">Use RBC to extend a verified advantage.</h2><p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Activation, pricing, and expiry are confirmed by the server before any boost becomes active.</p></section>
    {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button className="text-label-md underline" onClick={load}>Retry</button></div> : null}
    <section><SectionTitle>Available boosts</SectionTitle>{boosts.length ? <div className="grid gap-3 lg:grid-cols-2">{boosts.map((boost) => { const active = Boolean(boost.active || boost.activeUntil); const disabled = Boolean(boost.disabled) || (!active && boost.available === false); return <Card key={boost.id} className="p-5"><div className="flex items-start gap-3"><IconTile icon={boost.icon || 'auto_awesome'} accent={accents[boost.icon] || '#8b2fd6'} size={46} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-title text-on-surface">{boost.label || boost.name}</h3><p className="mt-1 text-body-sm text-on-surface-variant">{boost.detail || 'Server-controlled mining benefit.'}</p></div>{active ? <Badge t="success">Active</Badge> : disabled ? <Badge t="outline">Unavailable</Badge> : <Badge t="secondary">{price(boost.costRbc)} RBC</Badge>}</div><p className="mt-4 text-label-sm text-on-surface-variant">{active && boost.activeUntil ? `Active until ${new Date(boost.activeUntil).toLocaleString()}` : `Duration: ${boost.durationHours || 0} hours`}</p><div className="mt-5">{active ? <Button full variant="ghost" disabled={disabled} loading={busy === boost.id} onClick={() => activate(boost, true)}>Extend boost</Button> : <Button full disabled={disabled} loading={busy === boost.id} onClick={() => activate(boost)} icon="bolt">Activate for {price(boost.costRbc)} RBC</Button>}</div></div></div></Card> })}</div> : <Card><StateView kind="empty" title="No boosts are available" desc="The server will show boost options when they are available to your account." action={<Button icon="refresh" onClick={load}>Refresh</Button>} /></Card>}</section>
  </div>
}
