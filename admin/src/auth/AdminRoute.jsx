import { Navigate, useLocation } from 'react-router-dom'
import { authorizeSession } from '../../../src/domain/auth/policy.ts'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'

export default function AdminRoute({ children }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading) return <div className="admin-auth-state" role="status">Checking your operator session…</div>

  const decision = authorizeSession(auth.session, 'operations')
  if (decision.allowed) return children

  if (decision.reason === 'unverified') {
    return <Navigate to="/verify" replace state={{ from: `${location.pathname}${location.search}`, userId: auth.session?.userId, challenges: [] }} />
  }
  if (decision.reason === 'unauthenticated' || decision.reason === 'expired') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return (
    <main className="admin-auth-state" role="alert">
      <span className="admin-eyebrow">WRS ADMIN CONSOLE</span>
      <h1>Access denied</h1>
      <p>Your account is not authorized to use the operator console.</p>
    </main>
  )
}
