import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Disclosure, Icon, List, Row, SectionTitle, Toggle } from '../components/ui.jsx'

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
        <List>
          <Row icon="person" t="outline" title="Personal details" subtitle="Name, email, phone, country" onClick={() => {}} />
          <Row icon="lock" t="outline" title="Password" subtitle="Changed 3 months ago" onClick={() => {}} />
          <Toggle checked={s.twoFactor} onChange={set('twoFactor')} label="Two-factor authentication" desc="Required for withdrawals" />
          <Toggle checked={s.biometric} onChange={set('biometric')} label="Biometric login" desc="Face or fingerprint unlock" />
        </List>
      </section>

      <section>
        <SectionTitle>Preferences</SectionTitle>
        <List>
          <Row title="Language" value="English" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Currency" value="USD" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Time zone" value="WAT (UTC+1)" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Toggle checked={s.notifications} onChange={set('notifications')} label="Push notifications" desc="Robot, deployment and wallet alerts" />
          <Toggle checked={s.marketing} onChange={set('marketing')} label="Campaign updates" desc="Occasional promotional messages" />
        </List>
      </section>

      <section>
        <SectionTitle>Robot</SectionTitle>
        <List>
          <Row title="Robot name" value="WRS-Pro-001" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Voice profile" value="Custom EN/YO" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Personality" value="Logical" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Deployment preference" value="Logistics" onClick={() => {}} right={<Icon name="chevron_right" className="text-outline" />} />
          <Toggle checked={s.safety} onChange={set('safety')} label="Safety controls" desc="Halt deployment on anomaly" />
        </List>
      </section>

      <section>
        <SectionTitle>Privacy &amp; data</SectionTitle>
        <List>
          <Toggle
            checked={s.trainingConsent}
            onChange={set('trainingConsent')}
            label="Training consent"
            desc="Use my data to improve my own robot"
          />
          <Toggle
            checked={s.dataSharing}
            onChange={set('dataSharing')}
            label="Data-sharing consent"
            desc="Include approved data in licensed datasets"
          />
          <Row icon="delete_sweep" t="outline" title="Delete biometric data" subtitle="Voice, facial and movement captures" onClick={() => {}} />
          <Row icon="download" t="outline" title="Download my data" subtitle="Full export as JSON" onClick={() => {}} />
        </List>
      </section>

      <Disclosure icon="shield">
        Biometric, facial, voice, movement and language data require explicit consent, are stored securely, and can be
        deleted at any time.
      </Disclosure>

      <Button variant="danger" full icon="delete_forever">
        Delete account
      </Button>
    </AppShell>
  )
}
