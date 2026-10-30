import { useState } from 'react'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'
import { securitySettingsUrl } from '../lib/externalRoutes.js'

export default function MfaPrompt() {
  const auth = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function verify(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await auth.stepUpMfa(code)
      setCode('')
    } catch (failure) {
      setError(failure.message || 'Could not check the code. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="admin-mfa">
      <div>
        <strong>Verify to make changes</strong>
        <p>
          {auth.session?.mfaEnabled
            ? 'Enter the current code from your authenticator app.'
            : 'Set up an authenticator app in Security settings.'}
        </p>
      </div>
      {auth.session?.mfaEnabled ? (
        <form onSubmit={verify}>
          <label className="sr-only" htmlFor="admin-mfa-code">
            Security code
          </label>
          <input
            id="admin-mfa-code"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <button className="admin-btn" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Check code'}
          </button>
        </form>
      ) : (
        <a className="admin-btn" href={securitySettingsUrl}>
          Set up verification
        </a>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
