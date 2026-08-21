import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Button, Disclosure, Icon, List, Row, SectionTitle, Toggle } from '../components/ui.jsx'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function Settings() {
  const auth = useAuth()
  const deleteDataPolicy = getSensitiveActionPolicy('account.deleteData')
  const deleteAccountPolicy = getSensitiveActionPolicy('account.deleteAccount')
  const [s, setS] = useState({ biometric: false, notifications: true, marketing: false, trainingConsent: true, dataSharing: true, safety: true })
  const set = (key) => (value) => setS({ ...s, [key]: value })

  return (
    <AppShell title={auth.isDemo ? 'Settings demo' : 'Settings'} back avatar={false}>
      <section>
        <SectionTitle>Account</SectionTitle>
        <List>
          <Row icon="person" t="outline" title="Personal details" subtitle={auth.isDemo ? 'Demo profile — editing is not connected' : 'Name, email, phone and verification'} />
          <Row icon="lock" t="outline" title="Password" subtitle="Use the verified recovery/security flow to change credentials" />
          <Row icon="shield_lock" t="tertiary" title="Two-factor authentication" subtitle={auth.session?.mfaEnabled ? 'Enabled — required for protected actions' : 'Not enabled'} to="/settings/security" />
          <Toggle checked={s.biometric} onChange={set('biometric')} label="Biometric login preview" desc="Device-local preference only until a passkey/device credential service is connected" />
        </List>
      </section>

      <section><SectionTitle>Preferences</SectionTitle><List><Row title="Language" value="English" right={<Icon name="chevron_right" className="text-outline" />} /><Row title="Currency" value="USD" right={<Icon name="chevron_right" className="text-outline" />} /><Row title="Time zone" value="WAT (UTC+1)" right={<Icon name="chevron_right" className="text-outline" />} /><Toggle checked={s.notifications} onChange={set('notifications')} label="Push notifications preview" desc="Preference persistence is completed in Plan 9" /><Toggle checked={s.marketing} onChange={set('marketing')} label="Campaign updates preview" desc="Preference persistence is completed in Plan 9" /></List></section>

      <section><SectionTitle>Robot</SectionTitle><List><Row title="Robot name" value="WRS-Pro-001" /><Row title="Voice profile" value="Custom EN/YO" /><Row title="Personality" value="Logical" /><Row title="Deployment preference" value="Logistics" /><Toggle checked={s.safety} onChange={set('safety')} label="Safety controls preview" desc="Authoritative robot preferences arrive in Plan 4" /></List></section>

      <section>
        <SectionTitle>Privacy &amp; data</SectionTitle>
        <List>
          <Toggle checked={s.trainingConsent} onChange={set('trainingConsent')} label="Training consent preview" desc="Authoritative consent lifecycle is Plan 6" />
          <Toggle checked={s.dataSharing} onChange={set('dataSharing')} label="Data-sharing consent preview" desc="Authoritative consent lifecycle is Plan 6" />
          <Row icon="delete_sweep" t="outline" title="Delete biometric data" subtitle={deleteDataPolicy.reason} />
          <Row icon="download" t="outline" title="Download my data" subtitle="Unavailable until the authoritative data export service is connected" />
        </List>
      </section>

      <Disclosure icon="shield">Authentication, verification and MFA state shown here comes from the auth session. WRS does not claim sensitive account/data deletion until the backend confirms it and records an audit event.</Disclosure>
      <Button variant="danger" full icon="delete_forever" disabled={!deleteAccountPolicy.enabled}>Delete account unavailable</Button>
    </AppShell>
  )
}
