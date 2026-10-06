import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'

export default function AdminOAuthReturn() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (new URLSearchParams(location.search).has('error')) {
      setError('Single sign-on could not be completed. Please sign in again.')
      return () => { active = false }
    }
    auth.refresh().then((session) => {
      if (!active) return
      if (session) navigate('/', { replace: true })
      else navigate('/login', { replace: true, state: { error: true } })
    })
    return () => { active = false }
  }, [auth, location.search, navigate])

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-live="polite">
        <span className="admin-eyebrow">WRS ADMIN CONSOLE</span>
        <h1>{error ? 'Sign-in needs attention' : 'Finishing secure sign in'}</h1>
        {error ? <p role="alert">{error}</p> : <p role="status">Checking your existing operator session…</p>}
        {error && <Link className="admin-auth-help" to="/login">Return to operator sign in</Link>}
      </section>
    </main>
  )
}
