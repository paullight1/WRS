import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import StateView from '../components/states/StateView.jsx'
import { hasRecentMfa } from '../domain/auth/policy.ts'
import { Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

function settingsFrom(snapshot) {
  return snapshot?.settings || {
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    notificationsEnabled: true,
    marketingEnabled: false,
    biometricLoginEnabled: false,
    safetyNotificationsEnabled: true,
  }
}

export default function SettingsProduction() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState(null)
  const [settings, setSettings] = useState(() => settingsFrom(null))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deletionReason, setDeletionReason] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  useEffect(() => {
    let active = true
    browserAccountClient
      .snapshot()
      .then((next) => {
        if (!active) return
        setSnapshot(next)
        setSettings(settingsFrom(next))
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Settings service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const save = async () => {
    setBusy('save')
    setMessage('')
    try {
      const next = await browserAccountClient.updateSettings(settings)
      setSettings(next)
      setMessage('Settings saved to your account.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Settings update failed.')
    } finally {
      setBusy('')
    }
  }

  const stepUp = async () => {
    setBusy('mfa')
    setMessage('')
    try {
      await auth.stepUpMfa(mfaCode)
      setMfaCode('')
      setMessage('Recent MFA proof confirmed for sensitive account actions.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'MFA step-up failed.')
    } finally {
      setBusy('')
    }
  }

  const requestDeletion = async () => {
    setBusy('delete')
    setMessage('')
    try {
      await browserAccountClient.requestDeletion(deletionReason)
      await auth.refresh()
      navigate('/login', { replace: true, state: { reason: 'account-deletion-requested' } })
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Account deletion request failed.')
    } finally {
      setBusy('')
    }
  }

  if (loading) {
    return (
      <AppShell title="Settings">
        <StateView kind="loading" title="Loading settings" desc="Reading your persisted account preferences." />
      </AppShell>
    )
  }
  if (error) {
    return (
      <AppShell title="Settings">
        <StateView kind="error" title="Settings unavailable" desc={error} />
      </AppShell>
    )
  }

  const recentMfa = auth.session ? hasRecentMfa(auth.session) : false
  return (
    <AppShell title="Settings" subtitle="Persistent account preferences">
      <section>
        <SectionTitle>Preferences</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          <Field label="Language" value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))} placeholder="en" />
          <Field label="Currency" value={settings.currency} onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))} placeholder="USD" />
          <Field label="Timezone" value={settings.timezone} onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))} placeholder="Africa/Lagos" />
          {[
            ['notificationsEnabled', 'Product notifications'],
            ['marketingEnabled', 'Marketing messages'],
            ['biometricLoginEnabled', 'Biometric login preference'],
            ['safetyNotificationsEnabled', 'Safety notifications'],
          ].map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-white/8 px-3 py-2 text-body-md text-on-surface">
              <span>{label}</span>
              <input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} />
            </label>
          ))}
          <Button full loading={busy === 'save'} onClick={save}>Save settings</Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Security</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <p className="text-body-sm text-on-surface-variant">Recent MFA: {recentMfa ? 'confirmed' : 'required for sensitive identity and deletion actions'}</p>
          <Button to="/settings/security" variant="ghost" full>Manage MFA</Button>
          {auth.session?.mfaEnabled && !recentMfa && (
            <>
              <Field label="Authenticator code for step-up" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" />
              <Button full loading={busy === 'mfa'} disabled={mfaCode.length !== 6} onClick={stepUp}>Verify current factor</Button>
            </>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Delete account</SectionTitle>
        <Card className="space-y-3 border-error/30 p-card-padding">
          <p className="text-body-sm text-on-surface-variant">Deletion revokes sessions immediately and enters a 24-hour recovery window. Private contributed data is deleted through the privacy queue before irreversible anonymization; required financial/security evidence is retained.</p>
          <Field label="Reason (optional)" value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} />
          <Button variant="danger" full loading={busy === 'delete'} disabled={!recentMfa} onClick={requestDeletion}>Request account deletion</Button>
          {!recentMfa && <p className="text-label-sm text-outline">Complete MFA step-up above before requesting deletion.</p>}
        </Card>
      </section>
      {message && <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">{message}</p>}
    </AppShell>
  )
}
