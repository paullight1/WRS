import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import AdminOAuthReturn from '../../../admin/src/screens/AdminOAuthReturn.jsx'
const state = vi.hoisted(() => ({ auth: null }))
vi.mock('../../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => state.auth }))
afterEach(cleanup)
function View({ entry = '/auth/callback' }) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/callback" element={<AdminOAuthReturn />} />
        <Route path="/" element={<h1>Admin overview</h1>} />
      </Routes>
    </MemoryRouter>
  )
}
it('reports provider errors without refreshing a failed sign-in', () => {
  state.auth = { refresh: vi.fn() }
  render(<View entry="/auth/callback?error=access_denied" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Single sign-on could not be completed')
  expect(state.auth.refresh).not.toHaveBeenCalled()
})
it('finishes sign-in when the auth context updates while refresh is pending', async () => {
  let finish
  const refresh = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  state.auth = { refresh, session: null }
  const view = render(<View />)
  state.auth = { refresh, session: { userId: 'operator-1' } }
  view.rerender(<View />)
  expect(refresh).toHaveBeenCalledOnce()
  finish({ userId: 'operator-1' })
  expect(await screen.findByRole('heading', { name: 'Admin overview' })).toBeInTheDocument()
})
