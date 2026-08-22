import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../src/components/ui.jsx'

describe('Button', () => {
  it('prevents activation while disabled', () => {
    const onClick = vi.fn()
    render(createElement(Button, { disabled: true, onClick }, 'Sensitive action'))
    const button = screen.getByRole('button', { name: 'Sensitive action' })
    expect(button).toBeDisabled()
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
