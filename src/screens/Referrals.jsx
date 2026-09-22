import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Stat, Toast } from '../components/ui.jsx'
import { user } from '../data/mock.js'

const history = [
  { rank: 1, name: 'Builder 01', date: 'Joined Sep 18, 2026', state: 'Qualified', reward: 5 },
  { rank: 2, name: 'Builder 02', date: 'Joined Sep 16, 2026', state: 'Qualified', reward: 5 },
  { rank: 3, name: 'Builder 03', date: 'Joined Sep 14, 2026', state: 'Pending', reward: 0 },
  { rank: 4, name: 'Builder 04', date: 'Joined Sep 10, 2026', state: 'Qualified', reward: 5 },
]

export default function Referrals() {
  const [toast, setToast] = useState('')
  const link = `https://worldroboticsystem.com/register?ref=${user.referralCode}`
  const copy = (text, msg) => {
    navigator.clipboard?.writeText(text)
    setToast(`${msg} — referral only`)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title="Referrals" back avatar={false}>
      <section>
        <Card className="p-card-padding text-center">
          <Icon name="group_add" className="text-[36px] text-secondary" />
          <h2 className="mt-2 font-headline-md text-headline-md text-on-surface">Referral flow preview</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Copying the code does not create, qualify or pay a referral.
          </p>
          <div className="mt-5 rounded-xl border border-dashed border-tertiary/30 bg-black/25 px-4 py-4">
            <p className="font-data text-data-lg text-tertiary">{user.referralCode}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="ghost" icon="content_copy" onClick={() => copy(user.referralCode, 'Code copied')}>
              Copy code
            </Button>
            <Button icon="share" onClick={() => copy(link, 'Link copied')}>
              Copy link
            </Button>
          </div>
        </Card>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Referrals" value={user.referrals} t="primary" />
        <Stat label="Active" value="9" t="tertiary" />
        <Stat label="Qualified" value="7" t="success" />
        <Stat label="Pending RoboCoin" value="10" t="secondary" />
      </section>
      <section>
        <SectionTitle>Referral history</SectionTitle>
        <Card className="divide-y divide-white/8">
          {history.map((h) => (
            <div key={h.name} className="flex items-center gap-4 px-5 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/[.08] font-data text-label-sm text-primary">
                #{h.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md text-on-surface">{h.name}</p>
                <p className="text-label-sm text-outline">{h.date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-label-md text-on-surface">{h.reward ? `${h.reward} RoboCoin` : '—'}</p>
                <Badge t="outline">{h.state}</Badge>
              </div>
            </div>
          ))}
        </Card>
      </section>
      <Disclosure icon="info">
        Production referral qualification, duplicate detection, review windows and rewards must be server-side and
        audit-backed.
      </Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
