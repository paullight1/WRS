import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { ChipBar, Badge, Button, Card, Field, Icon, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { marketplaceCategories, marketplaceItems } from '../data/mock.js'

export default function Marketplace() {
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [toast, setToast] = useState('')

  const list = marketplaceItems.filter(
    (i) => (cat === 'All' || i.cat === cat) && i.name.toLowerCase().includes(q.toLowerCase()),
  )

  const act = (item) => {
    setToast(`${item.state === 'Install' ? 'Installing' : item.state === 'Update' ? 'Updating' : 'Purchasing'} ${item.name}`)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title="Robot Marketplace">
      <Field placeholder="Search skills, packs, modules…" icon="search" value={q} onChange={(e) => setQ(e.target.value)} />

      <ChipBar items={marketplaceCategories} value={cat} onChange={setCat} visible={3} />

      <section>
        <SectionTitle action={`${list.length} items`}>{cat === 'All' ? 'Featured' : cat}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((it) => {
            const c = tone(it.tone)
            return (
              <Card key={it.name} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <IconTile icon={it.icon} accent={c.accent} size={48} radius={12} iconSize={22} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-title text-on-surface">{it.name}</p>
                    <p className="truncate text-label-sm text-outline">{it.dev}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-label-sm text-outline">
                  <span className="flex items-center gap-1">
                    <Icon name="star" className="text-[14px] text-secondary" fill />
                    {it.rating}
                  </span>
                  <span>·</span>
                  <span>{it.cat}</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-title text-on-surface">{it.price}</span>
                  <Button size="sm" variant={it.state === 'Buy' ? 'primary' : 'tertiary'} onClick={() => act(it)}>
                    {it.state}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
        {!list.length && (
          <Card className="p-10 text-center">
            <Icon name="search_off" className="text-[30px] text-outline" />
            <p className="mt-2 text-body-md text-outline">Nothing here yet. Try another category.</p>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Installed on {`WRS-Pro-001`}</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Quantum Core v1.4', 'Update available', 'primary'],
            ['LIDAR 360 Gen-4', 'Up to date', 'tertiary'],
            ['English Voice Pack', 'Up to date', 'tertiary'],
          ].map(([name, state, t]) => (
            <div key={name} className="flex items-center gap-3 px-5 py-3.5">
              <Icon name="extension" className="text-outline" />
              <span className="min-w-0 flex-1 truncate text-body-md text-on-surface-variant">{name}</span>
              <Badge t={t}>{state}</Badge>
            </div>
          ))}
        </Card>
      </section>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
