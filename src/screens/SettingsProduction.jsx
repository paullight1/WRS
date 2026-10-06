import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import StateView from '../components/states/StateView.jsx'
import { hasRecentMfa } from '../domain/auth/policy.ts'
import { Button, Card, Field, SectionTitle, List, Row } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

import { browserDataClient } from '../infrastructure/data/browserDataClient.ts'
import PreferencePicker from '../components/settings/PreferencePicker.jsx'
import {
  countryOptions,
  languageOptions,
  currencyOptions,
  timezoneOptions,
} from '../components/settings/preferenceOptions.js'

function settingsFrom(snapshot) {
  return (
    snapshot?.settings || {
      language: 'en',
      currency: 'USD',
      timezone: 'UTC',
      notificationsEnabled: true,
      marketingEnabled: false,
      biometricLoginEnabled: false,
      safetyNotificationsEnabled: true,
    }
  )
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
  const [country, setCountry] = useState('')

  useEffect(() => {
    let active = true
    browserAccountClient
      .snapshot()
      .then((next) => {
        if (!active) return
        setSnapshot(next)
        setCountry(next.profile?.countryCode || '')
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
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
      <section>
        <SectionTitle>Preferences</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          <PreferencePicker
            label="Language"
            value={settings.language}
            options={languageOptions}
            disabled={Boolean(busy)}
            onChange={(language) => setSettings((current) => ({ ...current, language }))}
          />
          <p className="text-label-sm text-outline">
            Preferred language for your account. The application currently displays in English.
          </p>
          <PreferencePicker
            label="Currency"
            value={settings.currency}
            options={currencyOptions}
            disabled={Boolean(busy)}
            onChange={(currency) => setSettings((current) => ({ ...current, currency }))}
          />
          <p className="text-label-sm text-outline">
            Display preference. XP and RoboCoin units stay the same; checkout uses the currency shown by the provider.
          </p>
          <PreferencePicker
            label="Timezone"
            value={settings.timezone}
            options={timezoneOptions}
            disabled={Boolean(busy)}
            onChange={(timezone) => setSettings((current) => ({ ...current, timezone }))}
          />
          {[
            ['notificationsEnabled', 'Product notifications'],
            ['marketingEnabled', 'Marketing messages'],
            ['biometricLoginEnabled', 'Biometric login preference (device support required)'],
            ['safetyNotificationsEnabled', 'Safety notifications'],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-white/8 px-3 py-2 text-body-md text-on-surface"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))}
              />
            </label>
          ))}
          <Button full loading={busy === 'save'} disabled={Boolean(busy)} onClick={save}>
            Save preferences
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Account &amp; region</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <PreferencePicker
            label="Country"
            value={country}
            options={countryOptions}
            disabled={Boolean(busy)}
            onChange={setCountry}
          />
          <Button
            full
            variant="ghost"
            disabled={!country || country === snapshot?.profile?.countryCode || Boolean(busy)}
            loading={busy === 'country'}
            onClick={async () => {
              setBusy('country')
              setMessage('')
              try {
                const profile = snapshot.profile
                await browserAccountClient.updateProfile({
                  fullName: profile.fullName,
                  email: profile.email,
                  phone: profile.phone,
                  countryCode: country,
                })
                const next = await browserAccountClient.snapshot()
                setSnapshot(next)
                setCountry(next.profile?.countryCode || '')
                setMessage('Country saved to your profile.')
              } catch (reason) {
                setMessage(reason instanceof Error ? reason.message : 'Country update failed.')
              } finally {
                setBusy('')
              }
            }}
          >
            Save country
          </Button>
          <p className="text-label-sm text-outline">
            Country is part of your account profile. Complete your name and international phone number in Personal
            details before saving.
          </p>
        </Card>
        <List className="mt-3">
          <Row icon="person" title="Personal details" subtitle="Name, email, phone and verification" to="/profile" />
          <Row icon="lock" title="Password recovery" subtitle="Request a secure password reset" to="/forgot-password" />
        </List>
      </section>
      <section>
        <SectionTitle>Robot &amp; community</SectionTitle>
        <List>
          <Row icon="smart_toy" title="My robot" subtitle="Robot identity and configuration" to="/robot" />
          <Row icon="tune" title="Customise robot" subtitle="Voice and personality" to="/robot/customize" />
          <Row
            icon="public"
            title="Public community profile"
            subtitle="Manage your public alias and leaderboard visibility"
            to="/community"
          />
          <Row
            icon="notifications"
            title="Notifications"
            subtitle="Read and manage account updates"
            to="/notifications"
          />
        </List>
      </section>
      <section>
        <SectionTitle>Privacy &amp; help</SectionTitle>
        <List>
          <Row
            icon="dataset"
            title="Data contributions"
            subtitle="Manage contributions and purpose-specific consent"
            to="/data"
          />
          <Row
            icon="download"
            title="Download my data"
            subtitle="Export contribution and consent records"
            right={
              <Button
                size="sm"
                variant="ghost"
                loading={busy === 'export'}
                disabled={Boolean(busy)}
                onClick={async () => {
                  setBusy('export')
                  setMessage('')
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
                    setMessage('Your data export is ready.')
                  } catch (reason) {
                    setMessage(reason instanceof Error ? reason.message : 'Data export failed.')
                  } finally {
                    setBusy('')
                  }
                }}
              >
                Export
              </Button>
            }
          />
          <Row icon="help" title="Support" subtitle="Help articles and your support tickets" to="/support" />
        </List>
      </section>

      <section>
        <SectionTitle>Security</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <p className="text-body-sm text-on-surface-variant">
            Recent MFA: {recentMfa ? 'confirmed' : 'required for sensitive identity and deletion actions'}
          </p>
          <Button to="/settings/security" variant="ghost" full>
            Manage MFA
          </Button>
          {auth.session?.mfaEnabled && !recentMfa && (
            <>
              <Field
                label="Authenticator code for step-up"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
              />
              <Button full loading={busy === 'mfa'} disabled={mfaCode.length !== 6} onClick={stepUp}>
                Verify current factor
              </Button>
            </>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Delete account</SectionTitle>
        <Card className="space-y-3 border-error/30 p-card-padding">
          <p className="text-body-sm text-on-surface-variant">
            Deletion revokes sessions immediately and enters a 24-hour recovery window. Private contributed data is
            deleted through the privacy queue before irreversible anonymization; required financial/security evidence is
            retained.
          </p>
          <Field
            label="Reason (optional)"
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
          />
          <Button variant="danger" full loading={busy === 'delete'} disabled={!recentMfa} onClick={requestDeletion}>
            Request account deletion
          </Button>
          {!recentMfa && (
            <p className="text-label-sm text-outline">Complete MFA step-up above before requesting deletion.</p>
          )}
        </Card>
      </section>
    </AppShell>
  )
}
