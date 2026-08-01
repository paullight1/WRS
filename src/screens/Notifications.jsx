import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Card, Chip, Icon, SectionTitle, tone } from '../components/ui.jsx'
import { notifications } from '../data/mock.js'

const cats = ['All', 'Robot Activity', 'Deployment', 'Data Task', 'Earnings', 'Wallet', 'Community Event']

export default function Notifications() {
  const [cat, setCat] = useState('All')
  const list = notifications.filter((n) => cat === 'All' || n.cat === cat)
  const unread = notifications.filter((n) => n.unread).length

  return (
    <AppShell title="Notifications" back avatar={false}>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <section>
        <SectionTitle action={`${unread} unread`}>Recent</SectionTitle>
        <div className="space-y-2">
          {list.map((n, i) => {
            const c = tone(n.tone)
            return (
              <Card key={i} className={`flex items-start gap-4 p-4 ${n.unread ? 'border-white/15' : 'opacity-70'}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                  <Icon name={n.icon} className={`${c.text} text-[20px]`} fill />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge t={n.tone}>{n.cat}</Badge>
                    {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />}
                  </div>
                  <p className="mt-1.5 text-body-md text-on-surface">{n.text}</p>
                </div>
                <span className="shrink-0 text-label-sm font-label-sm text-outline">{n.time}</span>
              </Card>
            )
          })}
          {!list.length && (
            <Card className="p-10 text-center">
              <Icon name="notifications_off" className="text-[30px] text-outline" />
              <p className="mt-2 text-body-md text-outline">Nothing in {cat}.</p>
            </Card>
          )}
        </div>
      </section>
    </AppShell>
  )
}
