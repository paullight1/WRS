import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import AdminVerification from '../../../admin/src/screens/AdminVerification.jsx'
const state = vi.hoisted(() => ({ auth: null }))
vi.mock('../../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => state.auth }))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const challenge = { id: 'challenge-1', kind: 'email' }
const open = () =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/verify']}>
        <AdminVerification />
      </MemoryRouter>
    </StrictMode>,
  )
it('loads verification methods once under StrictMode and submits the selected challenge', async () => {
  state.auth = {
    loading: false,
    session: { userId: 'member-1' },
    startVerification: vi.fn().mockResolvedValue({ userId: 'member-1', challenges: [challenge] }),
    verifyAccount: vi.fn().mockResolvedValue({}),
  }
  open()
  await screen.findByRole('combobox', { name: 'Verification method' })
  expect(state.auth.startVerification).toHaveBeenCalledOnce()
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify account' }))
  await waitFor(() =>
    expect(state.auth.verifyAccount).toHaveBeenCalledWith('member-1', 'challenge-1', 'email', '123456'),
  )
})
it('can retry after verification methods fail to load', async () => {
  state.auth = {
    loading: false,
    session: { userId: 'member-1' },
    startVerification: vi
      .fn()
      .mockRejectedValueOnce(new Error('Verification unavailable'))
      .mockResolvedValue({ userId: 'member-1', challenges: [challenge] }),
  }
  open()
  expect(await screen.findByRole('alert')).toHaveTextContent('Verification unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Retry verification setup' }))
  await screen.findByRole('combobox', { name: 'Verification method' })
  expect(state.auth.startVerification).toHaveBeenCalledTimes(2)
})
