import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, Field, Icon, ListRow, SectionTitle, Toast } from '../components/ui.jsx'

const topics = [
  { icon: 'inventory_2', t: 'primary', title: 'Package Questions', subtitle: 'Tiers, upgrades, billing' },
  { icon: 'account_balance_wallet', t: 'tertiary', title: 'Wallet Support', subtitle: 'Deposits and withdrawals' },
  { icon: 'rocket_launch', t: 'secondary', title: 'Deployment Support', subtitle: 'Assignments and contracts' },
  { icon: 'dataset', t: 'primary', title: 'Data Task Support', subtitle: 'Rejections and quality scores' },
  { icon: 'model_training', t: 'tertiary', title: 'Robot Training Support', subtitle: 'Uploads and consent' },
  { icon: 'gpp_maybe', t: 'error', title: 'Report Fraud', subtitle: 'Scams and impersonation' },
  { icon: 'bug_report', t: 'outline', title: 'Report Technical Problem', subtitle: 'Bugs and outages' },
]

const articles = [
  'How deployment revenue is calculated',
  'Why a data submission gets rejected',
  'Setting up two-factor authentication',
  'Understanding XP, points and boosts',
]

export default function Support() {
  const [toast, setToast] = useState('')
  const send = () => {
    setToast('Ticket submitted — reference #48213')
    setTimeout(() => setToast(''), 2400)
  }

  return (
    <AppShell title="Support Center" back avatar={false}>
      <section>
        <Card className="flex items-center gap-4 p-card-padding">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-tertiary/20 bg-tertiary/10">
            <Icon name="support_agent" className="text-tertiary" fill />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-on-surface">Live chat</p>
            <p className="text-label-sm font-label-sm text-outline">Typical reply under 5 minutes</p>
          </div>
          <Button size="sm">Start</Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Help articles</SectionTitle>
        <Card className="divide-y divide-white/5">
          {articles.map((a) => (
            <button key={a} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
              <Icon name="article" className="text-outline text-[20px]" />
              <span className="flex-1 text-body-md text-on-surface-variant">{a}</span>
              <Icon name="chevron_right" className="text-outline" />
            </button>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Topics</SectionTitle>
        <div className="space-y-2">
          {topics.map((t) => (
            <ListRow key={t.title} {...t} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Submit a ticket</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          <Field label="Subject" placeholder="Briefly describe the issue" icon="title" />
          <label className="block">
            <span className="mb-2 block text-label-sm font-label-sm text-on-surface-variant">Message</span>
            <textarea
              rows={4}
              placeholder="Tell us what happened…"
              className="glass w-full rounded-xl px-4 py-3 text-body-md text-on-surface outline-none transition-all placeholder:text-outline/60 focus:border-tertiary/60"
            />
          </label>
          <Button full size="lg" icon="send" onClick={send}>
            Submit Ticket
          </Button>
        </Card>
      </section>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
