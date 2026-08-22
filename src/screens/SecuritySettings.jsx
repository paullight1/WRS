import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Button, Card, Field, SectionTitle } from '../components/ui.jsx'

export default function SecuritySettings() {
  const auth = useAuth()
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  const start = async () => {
    try {
      setEnrollment(await auth.enrollMfa())
      setMessage('Scan the authenticator URI, then prove the factor before it is enabled.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to start MFA enrollment.')
    }
  }
  const verify = async () => {
    if (!enrollment) return
    try {
      await auth.verifyMfa(enrollment.enrollmentId, code)
      setEnrollment(null)
      setCode('')
      setMessage('Two-factor authentication is enabled.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Factor verification failed.')
    }
  }
  const disable = async () => {
    try {
      await auth.disableMfa(code)
      setCode('')
      setMessage('Two-factor authentication is disabled.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Stronger verification is required to disable MFA.')
    }
  }

  return (
    <AppShell title="Account Security" back avatar={false}>
      <section>
        <SectionTitle>Two-factor authentication</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          <p className="text-body-md text-on-surface-variant">
            Status: <strong className="text-on-surface">{auth.session?.mfaEnabled ? 'Enabled' : 'Not enabled'}</strong>
          </p>
          {!auth.session?.mfaEnabled && !enrollment && <Button onClick={start}>Enroll authenticator</Button>}
          {enrollment && (
            <>
              <p className="break-all rounded-xl bg-black/25 p-3 font-data text-label-sm text-on-surface-variant">
                {enrollment.provisioningUri}
              </p>
              <Field
                label="6-digit authenticator code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
              />
              <Button onClick={verify}>Verify and enable</Button>
              <div>
                <p className="text-label-sm text-outline">Store recovery codes offline. Each is single-use.</p>
                {enrollment.recoveryCodes?.map((item) => (
                  <code key={item} className="mr-2 text-label-sm text-tertiary">
                    {item}
                  </code>
                ))}
              </div>
            </>
          )}
          {auth.session?.mfaEnabled && (
            <>
              <Field label="Current factor or recovery code" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button variant="danger" onClick={disable}>
                Disable two-factor authentication
              </Button>
            </>
          )}
          {message && (
            <p role="status" className="text-label-sm text-on-surface-variant">
              {message}
            </p>
          )}
        </Card>
      </section>
    </AppShell>
  )
}
