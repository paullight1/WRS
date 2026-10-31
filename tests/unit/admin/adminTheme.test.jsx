import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AdminThemeProvider, useAdminTheme } from '../../../admin/src/theme/AdminThemeProvider.jsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
function Probe() {
  const { colorScheme } = useAdminTheme()
  return <span data-testid="scheme">{colorScheme}</span>
}
describe('admin appearance', () => {
  it('uses light mode even when an earlier dark preference exists', () => {
    localStorage.setItem('wrs-admin-theme', 'dark')
    render(
      <AdminThemeProvider>
        <Probe />
      </AdminThemeProvider>,
    )
    expect(screen.getByTestId('scheme')).toHaveTextContent('light')
    expect(document.querySelector('.admin-app')).toHaveAttribute('data-theme', 'light')
  })
})
