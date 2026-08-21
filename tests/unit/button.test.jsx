import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../src/components/ui.jsx'

describe('Button', () => {
  it('prevents activation while disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Sensitive action</Button>)
    const button = screen.getByRole('button', { name: 'Sensitive action' })
    expect(button).toBeDisabled()
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
