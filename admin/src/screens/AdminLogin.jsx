import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'

export default function AdminLogin() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await auth.login(identifier.trim(), password, rememberMe)
      const next = location.state?.from || '/'
      if (!result.session.emailVerified || !result.session.phoneVerified) {
        navigate('/verify', {
          replace: true,
          state: { from: next, userId: result.session.userId, challenges: result.challenges || [] },
        })
        return
      }
      navigate(next, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function beginOAuth(provider) {
    setError('')
    try {
      await auth.beginOAuth(provider, `${window.location.origin}/auth/callback`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Single sign-on could not be started.')
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <span className="admin-eyebrow">WORLD ROBOTIC SYSTEM</span>
        <h1 id="admin-login-title">Operator sign in</h1>
        <p className="admin-auth-intro">Use your existing WRS operator account to access the console.</p>
        <form className="admin-auth-form" onSubmit={submit}>
          <label htmlFor="admin-identifier">Email or phone</label>
          <input id="admin-identifier" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="admin-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Keep me signed in</label>
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <button className="admin-primary-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {auth.oauthEnabled && (
          <div className="admin-sso-actions">
            <span>Or continue with</span>
            <button type="button" onClick={() => beginOAuth('google')}>Google</button>
            <button type="button" onClick={() => beginOAuth('apple')}>Apple</button>
          </div>
        )}
        <Link className="admin-auth-help" to="/login">Return to sign in</Link>
      </section>
    </main>
  )
}
