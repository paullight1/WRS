import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './auth/AdminRoute.jsx'
import AdminLogin from './screens/AdminLogin.jsx'
import AdminOAuthReturn from './screens/AdminOAuthReturn.jsx'
import AdminVerification from './screens/AdminVerification.jsx'

const Operations = lazy(() => import('./screens/Operations.jsx'))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/verify" element={<AdminVerification />} />
      <Route path="/auth/callback" element={<AdminOAuthReturn />} />
      <Route path="/" element={<AdminRoute><Suspense fallback={<div className="admin-auth-state" role="status">Loading operations workspace…</div>}><Operations /></Suspense></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
