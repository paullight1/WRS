import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AdminThemeProvider, useAdminTheme } from '../../../admin/src/theme/AdminThemeProvider.jsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function ThemeProbe() {
  const { colorScheme, toggleTheme } = useAdminTheme()
  return <div data-testid="scheme" data-scheme={colorScheme}><button onClick={toggleTheme}>Toggle theme</button></div>
}

function renderTheme() {
  return render(<AdminThemeProvider><ThemeProbe /></AdminThemeProvider>)
}

describe('AdminThemeProvider', () => {
  it('defaults to light without reading customer theme preferences', () => {
    localStorage.setItem('wrs-theme', 'dark')
    renderTheme()

    expect(screen.getByTestId('scheme').dataset.scheme).toBe('light')
    expect(localStorage.getItem('wrs-admin-theme')).toBeNull()
  })

  it('persists dark mode under its admin-only storage key', () => {
    localStorage.setItem('wrs-theme', 'light')
    renderTheme()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }))

    expect(screen.getByTestId('scheme').dataset.scheme).toBe('dark')
    expect(localStorage.getItem('wrs-admin-theme')).toBe('dark')
    expect(localStorage.getItem('wrs-theme')).toBe('light')
  })

  it('falls back to light for an invalid stored choice', () => {
    localStorage.setItem('wrs-admin-theme', '{broken')
    renderTheme()

    expect(screen.getByTestId('scheme').dataset.scheme).toBe('light')
  })
})
