import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Disclosure, Icon, List, Row, SectionTitle, Toggle } from '../components/ui.jsx'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function Settings() {
  const deleteDataPolicy = getSensitiveActionPolicy('account.deleteData')
  const deleteAccountPolicy = getSensitiveActionPolicy('account.deleteAccount')
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
    <AppShell title="Settings demo" back avatar={false}>
      <section><SectionTitle>Account</SectionTitle><List><Row icon="person" t="outline" title="Personal details" subtitle="Demo profile — editing is not connected" /><Row icon="lock" t="outline" title="Password" subtitle="Live password management arrives with identity service" /><Toggle checked={s.twoFactor} onChange={set('twoFactor')} label="Two-factor authentication preview" desc="Local demo preference only" /><Toggle checked={s.biometric} onChange={set('biometric')} label="Biometric login preview" desc="Local demo preference only" /></List></section>

      <section><SectionTitle>Preferences</SectionTitle><List><Row title="Language" value="English" right={<Icon name="chevron_right" className="text-outline" />} /><Row title="Currency" value="USD" right={<Icon name="chevron_right" className="text-outline" />} /><Row title="Time zone" value="WAT (UTC+1)" right={<Icon name="chevron_right" className="text-outline" />} /><Toggle checked={s.notifications} onChange={set('notifications')} label="Push notifications preview" desc="Local demo preference only" /><Toggle checked={s.marketing} onChange={set('marketing')} label="Campaign updates preview" desc="Local demo preference only" /></List></section>

      <section><SectionTitle>Robot</SectionTitle><List><Row title="Robot name" value="WRS-Pro-001" /><Row title="Voice profile" value="Custom EN/YO" /><Row title="Personality" value="Logical" /><Row title="Deployment preference" value="Logistics" /><Toggle checked={s.safety} onChange={set('safety')} label="Safety controls preview" desc="Local demo preference only" /></List></section>

      <section>
        <SectionTitle>Privacy &amp; data</SectionTitle>
        <List>
          <Toggle checked={s.trainingConsent} onChange={set('trainingConsent')} label="Training consent preview" desc="Not persisted or used for live capture" />
          <Toggle checked={s.dataSharing} onChange={set('dataSharing')} label="Data-sharing consent preview" desc="Not persisted or used for dataset licensing" />
          <Row icon="delete_sweep" t="outline" title="Delete biometric data" subtitle={deleteDataPolicy.reason} />
          <Row icon="download" t="outline" title="Download my data" subtitle="Unavailable until the authoritative data export service is connected" />
        </List>
      </section>

      <Disclosure icon="shield">WRS does not claim that biometric deletion or account deletion occurred until the authoritative backend confirms it and writes an audit record.</Disclosure>
      <Button variant="danger" full icon="delete_forever" disabled={!deleteAccountPolicy.enabled}>Delete account unavailable</Button>
    </AppShell>
  )
}
