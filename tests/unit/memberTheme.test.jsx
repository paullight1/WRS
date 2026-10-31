import { afterEach, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ThemeProvider } from '../../src/components/ThemeProvider.jsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})
it('uses light mode when an older dark preference is present', () => {
  localStorage.setItem('wrs-theme', 'dark')
  document.documentElement.classList.add('dark')
  render(
    <ThemeProvider>
      <p>Dashboard</p>
    </ThemeProvider>,
  )
  expect(document.documentElement).not.toHaveClass('dark')
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})
