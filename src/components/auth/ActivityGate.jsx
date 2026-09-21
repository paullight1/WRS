import { Navigate, useLocation } from 'react-router-dom'
import AppShell from '../AppShell.jsx'
import { ProtectedRoute } from './AuthProvider.jsx'
import StateView from '../states/StateView.jsx'
import { Button } from '../ui.jsx'
import { isActivityComingSoon, isActivityLocked } from '../../lib/activityAvailability.js'

export default function ActivityGate({ children }) {
  const { pathname } = useLocation()
  if (isActivityComingSoon(pathname)) {
    return (
      <ProtectedRoute policy="authenticated">
        <AppShell title="Marketplace" back>
          <StateView
            kind="empty"
            title="Coming soon"
            desc="The Marketplace is being prepared. Mining is available now while we build the next experience."
            action={<Button to="/deploy">Keep mining</Button>}
          />
        </AppShell>
      </ProtectedRoute>
    )
  }
  if (!isActivityLocked(pathname)) return children
  return <Navigate to="/deploy" replace state={{ from: pathname }} />
}
