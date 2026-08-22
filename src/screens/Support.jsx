import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button, Card, Field, Icon, List, Row, SectionTitle, Toast } from '../components/ui.jsx'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

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
  const policy = getSensitiveActionPolicy('support.ticket')
  const [toast, setToast] = useState('')
  const [sending, setSending] = useState(false)

  if (!runtimeConfig.isDemo && !policy.authoritative) {
    return (
      <AppShell title="Support unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live support service is not connected"
          desc="WRS will not fabricate ticket references or live-chat availability. Support submission stays closed until a real support system is authoritative."
          action={<Button to="/home">Back to dashboard</Button>}
        />
      </AppShell>
    )
  }

  const send = () => {
    if (!policy.enabled) return
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setToast('Demo ticket preview — nothing was submitted and no reference was issued')
      setTimeout(() => setToast(''), 2600)
    }, 350)
  }

  return (
    <AppShell title="Support demo" back avatar={false}>
      <section>
        <Card className="flex items-center gap-3.5 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tertiary/10">
            <Icon name="support_agent" className="text-tertiary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-title text-on-surface">Live chat preview</p>
            <p className="text-body-sm text-on-surface-variant">Not connected in demo mode</p>
          </div>
          <Button size="sm" disabled>
            Unavailable
          </Button>
        </Card>
      </section>
      <section>
        <SectionTitle>Common questions preview</SectionTitle>
        <List>
          {articles.map((a) => (
            <Row key={a} title={a} />
          ))}
        </List>
      </section>
      <section>
        <SectionTitle>Browse by topic</SectionTitle>
        <List>
          {topics.map((t) => (
            <Row key={t.title} {...t} />
          ))}
        </List>
      </section>
      <section>
        <SectionTitle>Ticket form preview</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label="Subject" placeholder="Demo subject" />
          <div>
            <label htmlFor="msg" className="mb-1.5 block text-label-md text-on-surface-variant">
              Message
            </label>
            <textarea
              id="msg"
              rows={4}
              placeholder="Demo message — nothing will be sent"
              className="w-full rounded-xl border border-white/12 bg-surface-container px-3.5 py-3 text-body-md text-on-surface outline-none placeholder:text-outline focus:border-primary"
            />
          </div>
          <Button full size="lg" icon="visibility" loading={sending} disabled={!policy.enabled} onClick={send}>
            {sending ? 'Opening preview' : 'Preview ticket submission'}
          </Button>
        </Card>
      </section>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
