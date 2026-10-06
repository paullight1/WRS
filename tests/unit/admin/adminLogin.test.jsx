import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminLogin from '../../../admin/src/screens/AdminLogin.jsx'

const authState = vi.hoisted(() => ({ current: null }))
vi.mock('../../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => authState.current }))

afterEach(() => {
  cleanup()
  authState.current = null
})

function renderLogin() {
  return render(<MemoryRouter><AdminLogin /></MemoryRouter>)
}

describe('AdminLogin', () => {
  it('signs in through shared auth and does not expose consumer registration', async () => {
    authState.current = {
      login: vi.fn().mockResolvedValue({ session: { emailVerified: true, phoneVerified: true }, challenges: [] }),
      oauthEnabled: false,
    }
    renderLogin()
    fireEvent.change(screen.getByLabelText(/email or phone/i), { target: { value: 'operator@example.test' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret-password' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(authState.current.login).toHaveBeenCalledWith('operator@example.test', 'secret-password', true))
    expect(screen.queryByRole('link', { name: /register|create account/i })).toBeNull()
  })

  it('shows shared authentication errors clearly', async () => {
    authState.current = { login: vi.fn().mockRejectedValue(new Error('Invalid credentials.')), oauthEnabled: false }
    renderLogin()
    fireEvent.change(screen.getByLabelText(/email or phone/i), { target: { value: 'operator@example.test' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.')
  })
})
