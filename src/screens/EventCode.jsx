import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, Disclosure, Icon, SectionTitle, Toast } from '../components/ui.jsx'
import StateView from '../components/states/StateView.jsx'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function EventCode() {
  const policy = getSensitiveActionPolicy('reward.eventCode')
  const [code, setCode] = useState('')
  const [toast, setToast] = useState('')

  if (!runtimeConfig.isDemo && !policy.authoritative) {
    return (
      <AppShell title="Event codes unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live reward validation is not connected"
          desc="WRS will not award XP or points from client-entered codes until the server-side event-code service is authoritative, single-use and abuse-protected."
          action={<Button to="/rewards">Back to rewards</Button>}
        />
      </AppShell>
    )
  }

  const submit = () => {
    if (!code.trim()) {
      setToast('Enter a code to preview the flow')
    } else if (!policy.enabled) {
      setToast(policy.reason)
    } else {
      setToast('Preview only — no XP, points, boost or attendance record was awarded')
    }
    setTimeout(() => setToast(''), 2600)
  }

  return (
    <AppShell title="Event code" back avatar={false}>
      <section>
        <Card className="p-card-padding text-center">
          <Icon name="confirmation_number" className="text-[54px] text-tertiary" />
          <h2 className="mt-3 font-headline-md text-headline-md text-on-surface">Preview event-code entry</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            The production service will verify event, expiry, account, device and one-time redemption server-side.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter event code"
            aria-label="event code"
            className="mt-5 w-full rounded-xl border border-outline-variant bg-black/30 px-4 py-3 text-center font-data text-on-surface outline-none focus:border-tertiary"
          />
          <Button full size="lg" className="mt-4" onClick={submit} disabled={!policy.enabled}>
            Preview code result
          </Button>
        </Card>
      </section>
      <section>
        <SectionTitle>reward outcome</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['XP', '+250 XP'],
            ['Points', '+250 points'],
            ['Robot boost', 'Preview only'],
            ['Attendance', 'Not recorded'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>
      <Disclosure icon="shield">
        Production event codes must be generated and redeemed by the backend with expiry, duplicate prevention, rate
        limits and audit logs.
      </Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
