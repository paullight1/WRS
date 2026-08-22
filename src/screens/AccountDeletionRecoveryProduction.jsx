import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import StateView from '../components/states/StateView.jsx'
import { hasRecentMfa } from '../domain/auth/policy.ts'
import { Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

export default function AccountDeletionRecoveryProduction() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    const next = await browserAccountClient.snapshot()
    setSnapshot(next)
    return next
  }

  useEffect(() => {
    let active = true
    browserAccountClient
      .snapshot()
      .then((next) => {
        if (active) setSnapshot(next)
      })
      .catch((reason) => {
        if (active) setMessage(reason instanceof Error ? reason.message : 'Deletion recovery state is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const stepUp = async () => {
    setBusy('mfa')
    setMessage('')
    try {
      await auth.stepUpMfa(mfaCode)
      setMfaCode('')
      await load()
      setMessage('Recent MFA proof confirmed. You can now cancel the deletion request.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'MFA step-up failed.')
    } finally {
      setBusy('')
    }
  }

  const cancel = async () => {
    if (!snapshot?.deletion?.id) return
    setBusy('cancel')
    setMessage('')
    try {
      await browserAccountClient.cancelDeletion(snapshot.deletion.id)
      await auth.refresh()
      navigate('/home', { replace: true })
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Deletion cancellation failed.')
    } finally {
      setBusy('')
    }
  }

  if (loading) {
    return (
      <AppShell title="Account recovery" avatar={false}>
        <StateView kind="loading" title="Loading deletion request" desc="Checking your recoverable account-deletion state." />
      </AppShell>
    )
  }

  const deletion = snapshot?.deletion
  if (!deletion) {
    return (
      <AppShell title="Account recovery" avatar={false}>
        <StateView kind="success" title="No account deletion is pending" desc="Your account is no longer in the deletion recovery window." action={<Button to="/home">Return home</Button>} />
      </AppShell>
    )
  }

  const recentMfa = auth.session ? hasRecentMfa(auth.session) : false
  return (
    <AppShell title="Account deletion pending" subtitle="Restricted recovery mode" avatar={false}>
      <section>
        <SectionTitle>Recovery window</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <p className="text-body-md text-on-surface-variant">Normal WRS activity is locked while this deletion request is pending. New deployments, rewards, data work, wallet actions and marketplace activity cannot resume until you cancel it.</p>
          <div className="rounded-xl border border-white/8 p-3">
            <p className="text-label-sm text-outline">Request status</p>
            <p className="mt-1 text-title text-on-surface">{deletion.status}</p>
            <p className="mt-1 text-label-sm text-outline">Irreversible processing may begin after {new Date(deletion.eligible_at).toLocaleString()} once private-data and financial/deployment obligations are clear.</p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Cancel deletion</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          {!auth.session?.mfaEnabled && <p className="text-body-sm text-error">A verified authenticator is required to cancel a deletion request. Contact support if you have lost access to your factor.</p>}
          {auth.session?.mfaEnabled && !recentMfa && (
            <>
              <Field label="Current authenticator code" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" />
              <Button full loading={busy === 'mfa'} disabled={mfaCode.length !== 6} onClick={stepUp}>Verify current factor</Button>
            </>
          )}
          <Button full variant="primary" loading={busy === 'cancel'} disabled={!recentMfa} onClick={cancel}>Cancel account deletion</Button>
        </Card>
      </section>
      {message && <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">{message}</p>}
    </AppShell>
  )
}
