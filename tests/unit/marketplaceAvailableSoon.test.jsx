import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MarketplaceProduction from '../../src/screens/MarketplaceProduction.jsx'
import { browserEcosystemClient } from '../../src/infrastructure/ecosystem/browserEcosystemClient.ts'

vi.mock('../../src/components/AppShell.jsx', () => ({
  default: ({ title, subtitle, children }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}))
vi.mock('../../src/infrastructure/ecosystem/browserEcosystemClient.ts', () => ({
  browserEcosystemClient: { marketplace: vi.fn(), acquire: vi.fn(), install: vi.fn() },
}))

const catalogueItem = {
  id: 'item-1',
  versionId: 'version-1',
  name: 'Yoruba Language Pack',
  description: 'Language support for robot interactions.',
  itemType: 'skill',
  minPackageSlug: 'starter',
  version: '1.0.0',
  priceMinor: 1200,
  currency: 'USD',
  skillSlug: 'language-yoruba',
  entitlementId: 'entitlement-1',
  installed: true,
}

describe('Marketplace available soon', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    browserEcosystemClient.marketplace.mockResolvedValue([catalogueItem])
  })

  it('renders approved server catalogue entries as inert Available soon items without commerce metadata', async () => {
    render(<MarketplaceProduction />)
    expect(await screen.findByRole('heading', { name: 'Marketplace' })).toBeInTheDocument()
    expect(await screen.findByText('Yoruba Language Pack')).toBeInTheDocument()
    expect(screen.getByText('Available soon')).toBeInTheDocument()
    expect(screen.queryByText('$12.00')).not.toBeInTheDocument()
    expect(screen.queryByText(/rating|\d+ approved|catalogue preview|\d+ demo items/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/read-only commerce preview|illustrative catalogue|plan 8|purchase|install/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /more \d+/i })).not.toBeInTheDocument()
    const action = screen.getByRole('button', { name: 'Available soon' })
    expect(action).toBeDisabled()
    fireEvent.click(action)
    expect(browserEcosystemClient.acquire).not.toHaveBeenCalled()
    expect(browserEcosystemClient.install).not.toHaveBeenCalled()
  })

  it('shows a useful empty state without counts or sample products', async () => {
    browserEcosystemClient.marketplace.mockResolvedValueOnce([])
    render(<MarketplaceProduction />)
    expect(await screen.findByText(/no items are available yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/marketplace demo|catalogue preview|illustrative/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ items?/i)).not.toBeInTheDocument()
    expect(screen.queryByText(catalogueItem.name)).not.toBeInTheDocument()
  })

  it('shows an unavailable state and retries the catalogue request', async () => {
    browserEcosystemClient.marketplace.mockRejectedValueOnce(new Error('Catalogue service unavailable'))
    render(<MarketplaceProduction />)
    expect(await screen.findByText(/marketplace unavailable/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(browserEcosystemClient.marketplace).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(catalogueItem.name)).toBeInTheDocument()
  })
})
