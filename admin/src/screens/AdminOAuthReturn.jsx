import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'

export default function AdminOAuthReturn() {
  const { refresh } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const error = new URLSearchParams(location.search).has('error')
    ? 'Single sign-on could not be completed. Please sign in again.'
    : ''

  useEffect(() => {
    let active = true
    if (error) return
    refresh().then((session) => {
      if (!active) return
      if (session) navigate('/', { replace: true })
      else navigate('/login', { replace: true, state: { error: true } })
    })
    return () => {
      active = false
    }
  }, [refresh, error, navigate])

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-live="polite">
        <span className="admin-eyebrow">WRS ADMIN CONSOLE</span>
        <h1>{error ? 'Sign-in needs attention' : 'Finishing secure sign in'}</h1>
        {error ? <p role="alert">{error}</p> : <p role="status">Checking your existing operator session…</p>}
        {error && (
          <Link className="admin-auth-help" to="/login">
            Return to operator sign in
          </Link>
        )}
      </section>
    </main>
  )
}
