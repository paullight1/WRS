import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Stat, Toast } from '../components/ui.jsx'
import { user } from '../data/mock.js'

const history = [
  { name: 'Ada N.', date: '24 Jul 2025', state: 'Qualified', reward: '$5.00' },
  { name: 'Segun T.', date: '18 Jul 2025', state: 'Qualified', reward: '$5.00' },
  { name: 'Mary K.', date: '11 Jul 2025', state: 'Pending', reward: '—' },
  { name: 'Ibrahim S.', date: '02 Jul 2025', state: 'Qualified', reward: '$5.00' },
]

export default function Referrals() {
  const [toast, setToast] = useState('')
  const link = `https://wrs.app/join/${user.referralCode}`

  const copy = (text, msg) => {
    navigator.clipboard?.writeText(text)
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <AppShell title="Refer and Earn" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding text-center">
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-secondary-container/25 blur-[70px]" />
          <div className="relative">
            <Icon name="group_add" className="text-[36px] text-secondary" fill />
            <h2 className="mt-2 font-headline-md text-[20px] text-on-surface">Grow the robotic network</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Share your code. Both of you earn when your invite qualifies.
            </p>

            <div className="mt-5 rounded-xl border border-dashed border-tertiary/30 bg-black/25 px-4 py-4">
              <p className="font-label-md text-[20px] tracking-[0.15em] text-tertiary">{user.referralCode}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="ghost" icon="content_copy" onClick={() => copy(user.referralCode, 'Code copied')}>
                Copy Code
              </Button>
              <Button icon="share" onClick={() => copy(link, 'Referral link copied')}>
                Share Link
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total referrals" value="14" t="primary" />
        <Stat label="Active" value="9" t="tertiary" />
        <Stat label="Qualified" value="7" t="success" />
        <Stat label="Pending rewards" value="$10.00" t="secondary" />
      </section>

      <section>
        <SectionTitle action="Ambassador · Tier 2">Referral history</SectionTitle>
        <Card className="divide-y divide-white/5">
          {history.map((h) => (
            <div key={h.name} className="flex items-center gap-4 px-5 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 font-label-sm text-label-sm text-on-surface-variant">
                {h.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md text-on-surface">{h.name}</p>
                <p className="text-label-sm font-label-sm text-outline">{h.date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-label-md text-label-md text-on-surface">{h.reward}</p>
                <Badge t={h.state === 'Qualified' ? 'tertiary' : 'outline'}>{h.state}</Badge>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Qualification rules</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            'Referral must verify email and phone',
            'Referral must activate a package',
            'Self-referral is blocked',
            'Duplicate accounts are detected and removed',
            'Rewards pay out after the 14-day review window',
          ].map((r) => (
            <div key={r} className="flex items-center gap-3 px-5 py-3.5">
              <Icon name="check_circle" className="text-tertiary text-[18px]" fill />
              <span className="text-body-md text-on-surface-variant">{r}</span>
            </div>
          ))}
        </Card>
      </section>

      <Disclosure icon="info">
        Referrals are a secondary benefit. The core value of WRS is your robot, your training and your verified work.
      </Disclosure>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
