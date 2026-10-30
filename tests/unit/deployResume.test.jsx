import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import Deploy from '../../src/screens/Deploy.jsx'
vi.mock('../../src/components/AppShell.jsx', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../../src/components/robot3d/Worksite3D.jsx', () => ({ default: () => null }))
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})
const open = () =>
  render(
    <MemoryRouter>
      <Deploy />
    </MemoryRouter>,
  )
it('resumes a saved starting area once without resetting its start timestamp on rerender', () => {
  localStorage.setItem('wrs-mining-selected-area', 'Logistics & Warehousing')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100000)
  const view = open()
  expect(localStorage.getItem('wrs-mining-started-at')).toBe('100000')
  clock.mockReturnValue(200000)
  view.rerender(
    <MemoryRouter>
      <Deploy />
    </MemoryRouter>,
  )
  expect(localStorage.getItem('wrs-mining-started-at')).toBe('100000')
})
it('records the start time only when the starting-area button is clicked', () => {
  vi.spyOn(Date, 'now').mockReturnValue(100000)
  open()
  expect(localStorage.getItem('wrs-mining-started-at')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Start Warehouse Assistant/ }))
  expect(localStorage.getItem('wrs-mining-started-at')).toBe('100000')
  expect(localStorage.getItem('wrs-mining-selected-area')).toBe('Logistics & Warehousing')
})
