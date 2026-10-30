import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import AdminHint from '../../../admin/src/components/AdminHint.jsx'
afterEach(cleanup)
it('keeps a hint open when focus moves inside it and closes on Escape', () => {
  render(
    <AdminHint label="Supply information">
      <a href="#more">Read details</a>
    </AdminHint>,
  )
  const summary = screen.getByRole('button', { name: 'Supply information' })
  fireEvent.click(summary)
  const details = summary.closest('details')
  expect(details.open).toBe(true)
  fireEvent.blur(summary, { relatedTarget: screen.getByRole('link', { name: 'Read details' }) })
  expect(details.open).toBe(true)
  fireEvent.keyDown(summary, { key: 'Escape' })
  expect(details.open).toBe(false)
})
