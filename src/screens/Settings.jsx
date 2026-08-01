import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, Disclosure, Icon, ListRow, SectionTitle, Toggle } from '../components/ui.jsx'

export default function Settings() {
  const [s, setS] = useState({
    twoFactor: true,
    biometric: false,
    notifications: true,
    marketing: false,
    trainingConsent: true,
    dataSharing: true,
    safety: true,
  })
  const set = (k) => (v) => setS({ ...s, [k]: v })

  return (
    <AppShell title="Settings" back avatar={false}>
      <section>
        <SectionTitle>Account</SectionTitle>
        <div className="space-y-2">
          <ListRow icon="person" t="primary" title="Personal details" subtitle="Name, email, phone, country" />
          <ListRow icon="lock" t="secondary" title="Password" subtitle="Last changed 3 months ago" />
          <Toggle checked={s.twoFactor} onChange={set('twoFactor')} label="Two-factor authentication" desc="Required for withdrawals" />
          <Toggle checked={s.biometric} onChange={set('biometric')} label="Biometric login" desc="Face or fingerprint unlock" />
        </div>
      </section>

      <section>
        <SectionTitle>Preferences</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Language', 'English'],
            ['Currency', 'USD'],
            ['Time zone', 'WAT (UTC+1)'],
          ].map(([k, v]) => (
            <button key={k} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="flex items-center gap-1 text-label-md font-label-md text-on-surface">
                {v} <Icon name="chevron_right" className="text-[18px] text-outline" />
              </span>
            </button>
          ))}
        </Card>
        <div className="mt-2 space-y-2">
          <Toggle checked={s.notifications} onChange={set('notifications')} label="Push notifications" desc="Robot, deployment and wallet alerts" />
          <Toggle checked={s.marketing} onChange={set('marketing')} label="Campaign updates" desc="Occasional promotional messages" />
        </div>
      </section>

      <section>
        <SectionTitle>Robot settings</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Robot name', 'WRS-Pro-001'],
            ['Voice profile', 'David — Custom EN/YO'],
            ['Personality', 'Logical'],
            ['Primary language', 'English'],
            ['Deployment preference', 'Logistics'],
          ].map(([k, v]) => (
            <button key={k} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="flex items-center gap-1 text-label-md font-label-md text-on-surface">
                {v} <Icon name="chevron_right" className="text-[18px] text-outline" />
              </span>
            </button>
          ))}
        </Card>
        <div className="mt-2 space-y-2">
          <Toggle checked={s.safety} onChange={set('safety')} label="Safety controls" desc="Halt deployment on anomaly" />
        </div>
      </section>

      <section>
        <SectionTitle>Privacy & data consent</SectionTitle>
        <div className="space-y-2">
          <Toggle checked={s.trainingConsent} onChange={set('trainingConsent')} label="Training consent" desc="Use my data to improve my own robot" />
          <Toggle checked={s.dataSharing} onChange={set('dataSharing')} label="Data-sharing consent" desc="Include approved data in licensed datasets" />
          <ListRow icon="delete_sweep" t="outline" title="Delete uploaded biometric data" subtitle="Voice, facial and movement captures" />
          <ListRow icon="download" t="outline" title="Download my data" subtitle="Full export as JSON" />
        </div>
      </section>

      <Disclosure icon="shield">
        Biometric, facial, voice, movement and language data require explicit consent, are stored securely and can be
        deleted at any time.
      </Disclosure>

      <Button variant="danger" full icon="delete_forever">
        Delete account
      </Button>
    </AppShell>
  )
}
