import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, Field, Icon, List, Row, SectionTitle, Toast } from '../components/ui.jsx'

const topics = [
  { icon: 'inventory_2', t: 'primary', title: 'Packages', subtitle: 'Tiers, upgrades, billing' },
  { icon: 'account_balance_wallet', t: 'tertiary', title: 'Wallet', subtitle: 'Deposits and withdrawals' },
  { icon: 'rocket_launch', t: 'secondary', title: 'Deployment', subtitle: 'Assignments and contracts' },
  { icon: 'dataset', t: 'primary', title: 'Data tasks', subtitle: 'Rejections and quality scores' },
  { icon: 'model_training', t: 'tertiary', title: 'Robot training', subtitle: 'Uploads and consent' },
  { icon: 'gpp_maybe', t: 'error', title: 'Report fraud', subtitle: 'Scams and impersonation' },
  { icon: 'bug_report', t: 'outline', title: 'Technical problem', subtitle: 'Bugs and outages' },
]

const articles = [
  'How deployment revenue is calculated',
  'Why a data submission gets rejected',
  'Setting up two-factor authentication',
  'Understanding XP, points and boosts',
]

export default function Support() {
  const [toast, setToast] = useState('')
  const [sending, setSending] = useState(false)

  const send = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setToast('Ticket submitted — reference #48213')
      setTimeout(() => setToast(''), 2400)
    }, 700)
  }

  return (
    <AppShell title="Support" back avatar={false}>
      <section>
        <Card className="flex items-center gap-3.5 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tertiary/10">
            <Icon name="support_agent" className="text-tertiary" fill />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-title text-on-surface">Live chat</p>
            <p className="text-body-sm text-on-surface-variant">Typically replies in under 5 minutes</p>
          </div>
          <Button size="sm">Start</Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Common questions</SectionTitle>
        <List>
          {articles.map((a) => (
            <Row key={a} title={a} onClick={() => {}} />
          ))}
        </List>
      </section>

      <section>
        <SectionTitle>Browse by topic</SectionTitle>
        <List>
          {topics.map((t) => (
            <Row key={t.title} {...t} onClick={() => {}} />
          ))}
        </List>
      </section>

      <section>
        <SectionTitle>Still stuck?</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label="Subject" placeholder="Briefly describe the issue" />
          <div>
            <label htmlFor="msg" className="mb-1.5 block text-label-md text-on-surface-variant">
              Message
            </label>
            <textarea
              id="msg"
              rows={4}
              placeholder="Tell us what happened…"
              className="w-full rounded-xl border border-white/12 bg-surface-container px-3.5 py-3 text-body-md text-on-surface outline-none transition-colors duration-fast placeholder:text-outline focus:border-primary"
            />
          </div>
          <Button full size="lg" icon="send" loading={sending} onClick={send}>
            {sending ? 'Sending' : 'Submit ticket'}
          </Button>
        </Card>
      </section>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
