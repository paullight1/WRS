import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Icon, ListRow, SectionTitle, Tabs, tone } from '../components/ui.jsx'
import { communityEvents, leaderboard } from '../data/mock.js'

const announcements = [
  { title: 'WRS Core v4.3 rolls out next week', body: 'Faster training and improved language accuracy.', time: '2h' },
  { title: 'New deployment partner in Kenya', body: 'Logistics sector opens 400 new assignments.', time: '1d' },
  { title: 'Data quality thresholds updated', body: 'Minimum approval score moves to 85%.', time: '3d' },
]

export default function Community() {
  const [tab, setTab] = useState('Events')

  return (
    <AppShell title="WRS Community" back avatar={false}>
      <Tabs items={['Events', 'Announcements', 'Leaderboard']} value={tab} onChange={setTab} />

      {tab === 'Events' && (
        <>
          <section>
            <SectionTitle action="This week">Upcoming</SectionTitle>
            <div className="space-y-2">
              {communityEvents.map((e) => (
                <Card key={e.title} className="p-4">
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10">
                      <Icon name={e.icon} className="text-primary text-[22px]" fill />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md font-medium text-on-surface">{e.title}</p>
                      <p className="text-label-sm text-outline">{e.when}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge t="tertiary">{e.type}</Badge>
                        <span className="text-label-sm text-outline">
                          {e.attendees.toLocaleString()} attending
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="flex-1">
                      Join
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1">
                      Remind me
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <div className="space-y-2">
            <ListRow icon="qr_code_scanner" t="secondary" title="Enter Event Code" subtitle="Confirm attendance and earn XP" to="/rewards/event-code" />
            <ListRow icon="campaign" t="primary" title="Share a Campaign" subtitle="Promote WRS and earn points" to="/referrals" />
            <ListRow icon="gavel" t="outline" title="Community Rules" subtitle="How we keep the space useful" />
          </div>
        </>
      )}

      {tab === 'Announcements' && (
        <section>
          <SectionTitle action="Official">Announcements</SectionTitle>
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.title} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-body-md font-medium text-on-surface">{a.title}</p>
                  <span className="shrink-0 text-label-sm text-outline">{a.time}</span>
                </div>
                <p className="mt-1 text-body-md text-on-surface-variant">{a.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {tab === 'Leaderboard' && (
        <section>
          <SectionTitle action="All time">Top members</SectionTitle>
          <Card className="divide-y divide-white/8">
            {leaderboard.map((m) => {
              const c = tone(m.tone)
              return (
                <div key={m.rank} className={`flex items-center gap-4 px-5 py-4 ${m.you ? 'bg-primary-container/10' : ''}`}>
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-label-sm ${c.bg} ${c.border} ${c.text}`}
                  >
                    {m.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                    {m.name} {m.you && <span className="text-label-sm text-primary">(you)</span>}
                  </span>
                  <span className="shrink-0 text-label-md text-tertiary">
                    {m.xp.toLocaleString()} XP
                  </span>
                </div>
              )
            })}
          </Card>
        </section>
      )}
    </AppShell>
  )
}
