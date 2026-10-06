import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from '../../../admin/src/auth/AdminRoute.jsx'
import AdminOAuthReturn from '../../../admin/src/screens/AdminOAuthReturn.jsx'

const authState = vi.hoisted(() => ({ current: null }))
vi.mock('../../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => authState.current }))

afterEach(() => {
  cleanup()
  authState.current = null
})

function operatorSession(overrides = {}) {
  return {
    userId: 'operator-1',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    roles: ['support_operator'],
    expiresAt: '2099-01-01T00:00:00.000Z',
    accountDeletionPending: false,
    ...overrides,
  }
}

function renderGuarded(initialEntry = '/operations') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<AdminRoute><div>Operations console</div></AdminRoute>} />
        <Route path="/login" element={<div>Admin sign in</div>} />
        <Route path="/verify" element={<div>Verify your operator account</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRoute', () => {
  it('redirects an unauthenticated operator to admin login', () => {
    authState.current = { session: null, loading: false }
    renderGuarded()

    expect(screen.getByText('Admin sign in')).toBeTruthy()
  })

  it('allows a verified operator with an operations role', () => {
    authState.current = { session: operatorSession(), loading: false }
    renderGuarded()

    expect(screen.getByText('Operations console')).toBeTruthy()
  })

  it('denies a signed-in account without an operations role', () => {
    authState.current = { session: operatorSession({ roles: ['user'] }), loading: false }
    renderGuarded()

    expect(screen.getByText(/not authorized/i)).toBeTruthy()
  })

  it('sends an unverified operator to verification', () => {
    authState.current = { session: operatorSession({ emailVerified: false }), loading: false }
    renderGuarded()

    expect(screen.getByText('Verify your operator account')).toBeTruthy()
  })

  it('shows a loading state while the shared session is checked', () => {
    authState.current = { session: null, loading: true }
    renderGuarded()

    expect(screen.getByRole('status')).toBeTruthy()
  })
})

describe('AdminOAuthReturn', () => {
  it('refreshes the shared session after the API OAuth callback', async () => {
    authState.current = { refresh: vi.fn().mockResolvedValue(operatorSession()) }
    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<AdminOAuthReturn />} />
          <Route path="/" element={<div>Operations console</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(authState.current.refresh).toHaveBeenCalledOnce())
    expect(await screen.findByText('Operations console')).toBeTruthy()
  })
})
