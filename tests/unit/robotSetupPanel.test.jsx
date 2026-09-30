import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RobotSetupPanel from '../../src/components/robot/RobotSetupPanel.jsx'

const setup = (robotState) =>
  render(
    <MemoryRouter>
      <RobotSetupPanel robotState={robotState} />
    </MemoryRouter>,
  )

describe('RobotSetupPanel', () => {
  afterEach(cleanup)

  it('starts provisioning only when the authoritative robot service is available', () => {
    setup({ authoritative: true, isDemo: false, onboarding: null, error: '' })
    expect(screen.getByRole('heading', { name: 'Set up your robot' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start setup/i })).toHaveAttribute('href', '/onboarding')
  })

  it('resumes a saved setup draft', () => {
    setup({ authoritative: true, isDemo: false, onboarding: { step: 3 }, error: '' })
    expect(screen.getByRole('heading', { name: 'Continue robot setup' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue setup/i })).toHaveAttribute('href', '/onboarding')
  })

  it('offers a retry when the configured robot service cannot be reached', () => {
    const refresh = vi.fn()
    setup({
      authoritative: true,
      isDemo: false,
      onboarding: null,
      error: 'Robot service returned an invalid response.',
      refresh,
    })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not link into a dead-end onboarding flow when the service is disabled or in preview mode', () => {
    const { rerender } = setup({ authoritative: false, isDemo: false, onboarding: null, error: '' })
    expect(screen.getByRole('heading', { name: 'Robot service unavailable' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /setup/i })).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <RobotSetupPanel robotState={{ authoritative: false, isDemo: true, onboarding: null, error: '' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Robot setup unavailable' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /setup/i })).not.toBeInTheDocument()
  })
})
