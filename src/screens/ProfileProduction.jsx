import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

function formFromProfile(profile) {
  return {
    fullName: profile?.fullName || '',
    countryCode: profile?.countryCode || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  }
}

export default function ProfileProduction() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState(null)
  const [form, setForm] = useState(() => formFromProfile(null))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    const next = await browserAccountClient.snapshot()
    setSnapshot(next)
    setForm(formFromProfile(next.profile))
    return next
  }

  useEffect(() => {
    let active = true
    browserAccountClient
      .snapshot()
      .then((next) => {
        if (!active) return
        setSnapshot(next)
        setForm(formFromProfile(next.profile))
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Profile service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const save = async () => {
    setBusy(true)
    setMessage('')
    try {
      const result = await browserAccountClient.updateProfile({
        ...form,
        countryCode: form.countryCode.trim() ? form.countryCode : null,
      })
      const challenges = Array.isArray(result.challenges) ? result.challenges : []
      await auth.refresh()
      if (challenges.length > 0) {
        navigate('/verify', {
          state: {
            userId: result.profile?.userId || auth.session?.userId,
            challenges,
            from: '/profile',
          },
        })
        return
      }
      await load()
      setMessage('Profile changes saved to the authoritative account record.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Profile update failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Profile">
        <StateView kind="loading" title="Loading profile" desc="Reading your verified account record." />
      </AppShell>
    )
  }
  if (error || !snapshot?.profile) {
    return (
      <AppShell title="Profile">
        <StateView kind="error" title="Profile unavailable" desc={error || 'Profile record is unavailable.'} />
      </AppShell>
    )
  }

  const profile = snapshot.profile
  return (
    <AppShell title="Profile" subtitle="Authoritative account identity">
      <section>
        <SectionTitle>Identity</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          <Field
            label="Full name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
          />
          <Field
            label="Country code"
            value={form.countryCode}
            onChange={(event) =>
              setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase().slice(0, 2) }))
            }
            placeholder="NG"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="+234…"
          />
          <div className="flex flex-wrap gap-2">
            <Badge t={profile.emailVerified ? 'success' : 'gold'}>
              {profile.emailVerified ? 'Email verified' : 'Email verification required'}
            </Badge>
            <Badge t={profile.phoneVerified ? 'success' : 'gold'}>
              {profile.phoneVerified ? 'Phone verified' : 'Phone verification required'}
            </Badge>
            <Badge t={profile.kycStatus === 'verified' ? 'success' : 'outline'}>KYC {profile.kycStatus}</Badge>
          </div>
          <Button full loading={busy} onClick={save}>
            Save profile
          </Button>
          <p className="text-label-sm text-outline">
            Changing email or phone requires a recent MFA step-up. New identifiers become unverified until their OTP
            challenge succeeds.
          </p>
        </Card>
      </section>
      <Button to="/settings/security" variant="ghost" full>
        Account security &amp; MFA
      </Button>
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
