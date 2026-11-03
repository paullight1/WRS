import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppShell from '../../src/components/AppShell.jsx'
import WalletDashboard, { RoboCoinWallet } from '../../src/components/dashboard/WalletDashboard.jsx'

vi.mock('../../src/components/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ isDemo: true, session: { userId: 'navigation-test' } }),
}))
vi.mock('../../src/lib/runtimeConfig.js', () => ({ runtimeConfig: { services: { identity: false } } }))

afterEach(cleanup)

describe('integrated member navigation', () => {
  it('navigates between the distinct Home and Wallet screens using the shared tabs', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <AppShell title="Home" brand>
                <WalletDashboard />
              </AppShell>
            }
          />
          <Route
            path="/wallet"
            element={
              <AppShell title="RoboCoin (RBC) Wallet" back>
                <RoboCoinWallet />
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Wallet', exact: true }),
    )
    expect(screen.getByRole('heading', { name: 'RoboCoin (RBC) Wallet', exact: true })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Member balances' })).not.toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Home', exact: true }),
    )
    expect(screen.getByRole('region', { name: 'Member balances' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'RoboCoin wallet' })).not.toBeInTheDocument()
  })
  it('renders RoboCoin as the Wallet page without the Home overview', () => {
    render(
      <MemoryRouter>
        <RoboCoinWallet rbc="2,450.00 RBC" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('region', { name: 'RoboCoin wallet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send', exact: true })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Member balances' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Earnings Overview' })).not.toBeInTheDocument()
  })

  it.each(['/home', '/deploy', '/training', '/wallet', '/more'])('keeps the same five tabs on %s', (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppShell title="Member screen">
          <p>Screen content</p>
        </AppShell>
      </MemoryRouter>,
    )
    const navigation = within(screen.getByRole('navigation', { name: 'Primary' }))
    expect(navigation.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
      'Mine',
      'Train',
      'Wallet',
      'More',
    ])
    expect(navigation.getByRole('link', { name: 'Wallet', exact: true })).toHaveAttribute('href', '/wallet')
  })

  it('renders the overview as Home and links to the separate Wallet route', () => {
    render(
      <MemoryRouter>
        <WalletDashboard />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('region', { name: 'RoboCoin wallet' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open RoboCoin wallet' })).toHaveAttribute('href', '/wallet')
    expect(screen.queryByText('Send')).not.toBeInTheDocument()
  })
})
