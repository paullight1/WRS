import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import { Button, Disclosure, Icon, List, Row, SectionTitle, Toggle } from '../components/ui.jsx'
import { packageDefinition } from '../domain/robot/packages.ts'
import { browserDataClient } from '../infrastructure/data/browserDataClient.ts'
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
    safety: true,
  })
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState('')
  const set = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }))

  const robot = robotState.robot
  const configuration = robotState.configuration

  const exportData = async () => {
    setPrivacyBusy(true)
    setPrivacyMessage('')
    try {
      const result = await browserDataClient.exportData()
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result.manifest, null, 2)], { type: 'application/json' }),
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `wrs-data-export-${result.requestId}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setPrivacyMessage(`Data export ${result.requestId} prepared from authoritative audit records.`)
    } catch (error) {
      setPrivacyMessage(error instanceof Error ? error.message : 'Data export failed.')
    } finally {
      setPrivacyBusy(false)
    }
  }

  const deleteAllData = async () => {
    if (!window.confirm('Delete all WRS-owned private training/contribution data? Consent audit evidence is retained.'))
      return
    setPrivacyBusy(true)
    setPrivacyMessage('')
    try {
      const result = await browserDataClient.deleteAll('User requested deletion from Settings')
      setPrivacyMessage(`Deletion ${result.requestId} completed for ${result.deletedObjects || 0} private objects.`)
    } catch (error) {
      setPrivacyMessage(error instanceof Error ? error.message : 'Private data deletion failed.')
    } finally {
      setPrivacyBusy(false)
    }
  }

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
          <Row
            icon="mic"
            t="tertiary"
            title="Capture consent"
            subtitle="Purpose-specific consent is recorded at the exact microphone/camera workflow"
            to="/training"
          />
          <Row
            icon="dataset"
            t="primary"
            title="Dataset contribution"
            subtitle="Contribution and research/licensing consent are separate purposes"
            to="/data"
          />
          <Row
            icon="download"
            t="outline"
            title="Download my data"
            subtitle="Export consent, asset and submission audit records"
            right={
              <Button size="sm" variant="ghost" loading={privacyBusy} disabled={auth.isDemo} onClick={exportData}>
                Export
              </Button>
            }
          />
          <Row
            icon="delete_sweep"
            t="outline"
            title="Delete private data"
            subtitle={deleteDataPolicy.reason}
            right={
              <Button
                size="sm"
                variant="ghost"
                loading={privacyBusy}
                disabled={!deleteDataPolicy.authoritative}
                onClick={deleteAllData}
              >
                Delete
              </Button>
            }
          />
        </List>
        {privacyMessage && (
          <p role="status" className="mt-3 rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
            {privacyMessage}
          </p>
        )}
      </section>

      <Disclosure icon="shield">
        Authentication and robot state remain owned by their services. Consent evidence is append-only; deleting private
        data removes storage objects and tombstones assets/submissions without rewriting the historical consent audit
        trail.
      </Disclosure>
      <Button variant="danger" full icon="delete_forever" disabled={!deleteAccountPolicy.enabled}>
        Delete account unavailable
      </Button>
    </AppShell>
  )
}
