import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { ChipBar, Badge, Button, Card, Icon, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { boosts } from '../data/mock.js'

const types = ['All', 'Temporary', 'Permanent', 'Event']

export default function Boosts() {
  const [f, setF] = useState('All')
  const [sel, setSel] = useState(null)
  const [toast, setToast] = useState('')
  const list = boosts.filter((b) => f === 'All' || b.type === f)

  const activate = () => {
    setToast('Boost activated')
    setSel(null)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title="Robot Boosts" back avatar={false}>
      <section>
        <Card className="flex items-center justify-between gap-4 p-card-padding">
          <div>
            <p className="text-label-sm text-outline">Points available</p>
            <p className="font-headline-lg text-headline-lg font-bold text-tertiary">4,820</p>
          </div>
          <Icon name="stars" className="text-[40px] text-tertiary/60" fill />
        </Card>
        <p className="mt-3 text-label-sm leading-relaxed text-outline">
          Points may temporarily or permanently improve eligible digital robot functions.
        </p>
      </section>

      <ChipBar items={types} value={f} onChange={setF} visible={4} />

      <section>
        <SectionTitle action={`${list.length} boosts`}>Boost catalogue</SectionTitle>
        <div className="space-y-2">
          {list.map((b) => {
            const c = tone(b.tone)
            const active = sel === b.label
            return (
              <button
                key={b.label}
                onClick={() => setSel(active ? null : b.label)}
                className={`surface flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all ${
                  active ? 'border-tertiary/40 bg-tertiary/5' : 'hover:border-white/25'
                }`}
              >
                <IconTile icon={b.icon} accent={c.accent} size={48} radius={12} iconSize={22} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md text-on-surface">{b.label}</span>
                  <span className="block truncate text-label-sm text-outline">{b.desc}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-label-md text-tertiary">{b.cost} pts</span>
                  <Badge t={b.type === 'Permanent' ? 'secondary' : b.type === 'Event' ? 'primary' : 'outline'}>
                    {b.type}
                  </Badge>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <Button full size="lg" disabled={!sel} onClick={activate} icon="bolt">
        {sel ? `Activate ${sel}` : 'Select a boost'}
      </Button>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
