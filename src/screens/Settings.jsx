import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import { Button, Disclosure, Icon, List, Row, SectionTitle, Toggle } from '../components/ui.jsx'
import { packageDefinition } from '../domain/robot/packages.ts'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function Settings() {
  const auth = useAuth()
  const robotState = useRobot()
  const deleteDataPolicy = getSensitiveActionPolicy('account.deleteData')
  const deleteAccountPolicy = getSensitiveActionPolicy('account.deleteAccount')
  const [settings, setSettings] = useState({
    biometric: false,
    notifications: true,
    marketing: false,
    trainingConsent: true,
    dataSharing: true,
    safety: true,
  })
  const set = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }))

  const robot = robotState.robot
  const configuration = robotState.configuration

  return (
    <AppShell title={auth.isDemo ? 'Settings demo' : 'Settings'} back avatar={false}>
      <section>
        <SectionTitle>Account</SectionTitle>
        <List>
          <Row
            icon="person"
            t="outline"
            title="Personal details"
            subtitle={
              auth.isDemo
                ? 'Demo account — personal editing is not connected'
                : 'Identity and verification are owned by the authentication service'
            }
          />
          <Row
            icon="lock"
            t="outline"
            title="Password"
            subtitle="Use the verified recovery/security flow to change credentials"
            to="/forgot-password"
          />
          <Row
            icon="shield_lock"
            t="tertiary"
            title="Two-factor authentication"
            subtitle={auth.session?.mfaEnabled ? 'Enabled — available for protected action step-up' : 'Not enabled'}
            to="/settings/security"
          />
          <Toggle
            checked={settings.biometric}
            onChange={set('biometric')}
            label="Biometric login preview"
            desc="Device-local preference only until a passkey/device credential service is connected"
          />
        </List>
      </section>

      <section>
        <SectionTitle>Preferences</SectionTitle>
        <List>
          <Row title="Language" value="English" right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Currency" value="USD" right={<Icon name="chevron_right" className="text-outline" />} />
          <Row title="Time zone" value="WAT (UTC+1)" right={<Icon name="chevron_right" className="text-outline" />} />
          <Toggle
            checked={settings.notifications}
            onChange={set('notifications')}
            label="Push notifications preview"
            desc="Preference persistence is completed in Plan 9"
          />
          <Toggle
            checked={settings.marketing}
            onChange={set('marketing')}
            label="Campaign updates preview"
            desc="Preference persistence is completed in Plan 9"
          />
        </List>
      </section>

      <section>
        <SectionTitle>Robot</SectionTitle>
        {robot && configuration ? (
          <List>
            <Row title="Robot name" value={robot.name} to="/robot" />
            <Row title="Robot class" value={packageDefinition(robot.packageSlug).robotClass} to="/robot" />
            <Row title="Voice profile" value={configuration.voiceProfileId} to="/robot/customize" />
            <Row title="Personality" value={configuration.personality} to="/robot/customize" />
            <Row title="Configuration version" value={`v${configuration.version}`} to="/robot/customize" />
            <Toggle
              checked={settings.safety}
              onChange={set('safety')}
              label="Safety controls preview"
              desc="Runtime deployment safety remains owned by the deployment service"
            />
          </List>
        ) : (
          <List>
            <Row
              icon="smart_toy"
              t="outline"
              title="Robot not provisioned"
              subtitle={robotState.error || 'Complete onboarding to create a robot record'}
              to="/onboarding"
            />
          </List>
        )}
      </section>

      <section>
        <SectionTitle>Privacy &amp; data</SectionTitle>
        <List>
          <Toggle
            checked={settings.trainingConsent}
            onChange={set('trainingConsent')}
            label="Training consent preview"
            desc="Authoritative consent lifecycle is Plan 6"
          />
          <Toggle
            checked={settings.dataSharing}
            onChange={set('dataSharing')}
            label="Data-sharing consent preview"
            desc="Authoritative consent lifecycle is Plan 6"
          />
          <Row icon="delete_sweep" t="outline" title="Delete biometric data" subtitle={deleteDataPolicy.reason} />
          <Row
            icon="download"
            t="outline"
            title="Download my data"
            subtitle="Unavailable until the authoritative data export service is connected"
          />
        </List>
      </section>

      <Disclosure icon="shield">
        Authentication, verification, MFA and robot configuration shown here come from their authoritative
        session/service boundaries. WRS does not claim sensitive account/data deletion until the backend confirms it and
        records an audit event.
      </Disclosure>
      <Button variant="danger" full icon="delete_forever" disabled={!deleteAccountPolicy.enabled}>
        Delete account unavailable
      </Button>
    </AppShell>
  )
}
