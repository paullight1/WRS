import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Icon, IconTile, Progress, Tabs } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { miningApi } from '../../lib/miningApi.js'

const accents = { mic: '#8b2fd6', image: '#128b57', translate: '#d9660f', verified: '#2f6bff', event: '#b07d00' }
const amount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const scopes = { Daily: 'daily', Special: 'special' }

function missionList(data) {
  if (Array.isArray(data)) return data
  return data?.missions || data?.items || []
}

export default function Missions() {
  const [tab, setTab] = useState('Daily')
  const [missions, setMissions] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setMissions(missionList(await miningApi.getMissions(scopes[tab]))) } catch (requestError) { setError(requestError.message) }
  }, [tab])

  useEffect(() => { setMissions(null); load() }, [load])

  const claim = async (mission) => {
    setBusy(mission.id); setError('')
    try { await miningApi.claimMission(mission.id); await load() } catch (requestError) { setError(requestError.message) } finally { setBusy('') }
  }

  if (!missions && !error) return <LoadingView title="Loading missions" desc="Checking which verified contributions are eligible today." />
  if (!missions) return <StateView live kind="error" title="Missions unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#f3b91f]/30 bg-[linear-gradient(135deg,rgba(176,125,0,.18),rgba(18,22,31,.95)_54%)] p-5 sm:p-7"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-[#f7c948]"><Icon name="flag" fill /> Mining missions</p><h2 className="mt-2 font-headline-lg text-headline-lg text-on-surface">Contribute, verify, claim.</h2><p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Missions turn approved platform contributions into RBC. Progress and claimability always come from the server.</p></section>
      <Tabs items={Object.keys(scopes)} value={tab} onChange={setTab} />
      {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button onClick={load} className="text-label-md underline">Retry</button></div> : null}
      {missions.length ? <div className="grid gap-3 xl:grid-cols-2">{missions.map((mission) => {
        const progress = Number(mission.progress || 0)
        const target = Math.max(1, Number(mission.target || 1))
        const percent = Math.min(100, (progress / target) * 100)
        const status = String(mission.status || 'In progress').toLowerCase()
        const claimed = status === 'claimed'
        const claimable = status === 'claimable' || status === 'approved'
        return <Card key={mission.id} className="p-5"><div className="flex gap-3"><IconTile icon={mission.icon || 'flag'} accent={accents[mission.icon] || '#0f8fa0'} size={44} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-title text-on-surface">{mission.title}</h3><p className="mt-1 text-body-sm text-on-surface-variant">{mission.detail || 'Complete the required verified contribution.'}</p></div>{claimed ? <Badge t="success">Claimed</Badge> : claimable ? <Badge t="gold">Ready to claim</Badge> : <Badge t="outline">In progress</Badge>}</div><div className="mt-4"><div className="mb-2 flex justify-between text-label-sm"><span className="text-on-surface-variant">{progress} of {target} complete</span><span className="text-[#f7c948]">{amount(mission.rewardRbc)} RBC</span></div><Progress value={percent} color={claimable ? 'bg-[#f3b91f]' : 'bg-primary-container'} label={`${mission.title} progress`} /></div><div className="mt-5">{claimed ? <Button full disabled icon="check_circle">Reward claimed</Button> : claimable ? <Button full loading={busy === mission.id} onClick={() => claim(mission)} icon="redeem">Claim {amount(mission.rewardRbc)} RBC</Button> : <Button full to={mission.route || '/training'} variant="ghost" trailingIcon="arrow_forward">{progress ? 'Continue contribution' : 'Start contribution'}</Button>}</div></div></div></Card>
      })}</div> : <Card><StateView kind="empty" title={`No ${scopes[tab].toLowerCase()} missions right now`} desc={tab === 'Special' ? 'Special event missions appear only when an eligible WRS event is active.' : 'New daily missions will appear when server availability is confirmed.'} action={tab === 'Special' ? <Button to="/mining/event-code">Redeem event code</Button> : <Button icon="refresh" onClick={load}>Check again</Button>} /></Card>}
    </div>
  )
}
