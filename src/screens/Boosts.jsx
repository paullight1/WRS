import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { ChipBar, Badge, Button, Card, Icon, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { boosts } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

const types = ['All', 'Temporary', 'Permanent', 'Event']

export default function Boosts() {
  const policy = getSensitiveActionPolicy('reward.boost')
  const [f, setF] = useState('All')
  const [sel, setSel] = useState(null)
  const [toast, setToast] = useState('')
  const list = boosts.filter((b) => f === 'All' || b.type === f)

  if (!runtimeConfig.isDemo && !policy.authoritative) {
    return <AppShell title="Robot Boosts" back avatar={false}><StateView kind="locked" title="Live boosts are not connected" desc="WRS will not spend points or modify robot capabilities until the authoritative rewards service is available." action={<Button to="/rewards">Back to rewards</Button>} /></AppShell>
  }

  const activate = () => {
    if (!policy.enabled) return
    setToast('Demo boost preview — no points were spent and your robot was not changed')
    setSel(null)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <AppShell title="Robot Boosts demo" back avatar={false}>
      <section>
        <Card className="flex items-center justify-between gap-4 p-card-padding">
          <div><p className="text-label-sm text-outline">Illustrative points</p><p className="font-headline-lg text-headline-lg font-bold text-tertiary">4,820</p></div>
          <Icon name="stars" className="text-[40px] text-tertiary/60" fill />
        </Card>
        <p className="mt-3 text-label-sm leading-relaxed text-outline">Demo catalogue only. Selecting a boost does not alter points, entitlements or robot performance.</p>
      </section>
      <ChipBar items={types} value={f} onChange={setF} visible={4} />
      <section>
        <SectionTitle action={`${list.length} demo boosts`}>Boost catalogue</SectionTitle>
        <div className="space-y-2">
          {list.map((b) => {
            const c = tone(b.tone)
            const active = sel === b.label
            return <button key={b.label} onClick={() => setSel(active ? null : b.label)} className={`surface flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all ${active ? 'border-tertiary/40 bg-tertiary/5' : 'hover:border-white/25'}`}><IconTile icon={b.icon} accent={c.accent} size={48} radius={12} iconSize={22} /><span className="min-w-0 flex-1"><span className="block truncate text-body-md text-on-surface">{b.label}</span><span className="block truncate text-label-sm text-outline">{b.desc}</span></span><span className="shrink-0 text-right"><span className="block text-label-md text-tertiary">{b.cost} demo pts</span><Badge t="outline">{b.type}</Badge></span></button>
          })}
        </div>
      </section>
      <Button full size="lg" disabled={!sel || !policy.enabled} onClick={activate} icon="visibility">{sel ? `Preview ${sel}` : 'Select a boost'}</Button>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
