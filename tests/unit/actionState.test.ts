import { describe, expect, it } from 'vitest'
import { isTerminalActionState } from '../../src/domain/action-state'

describe('action state', () => {
  it('marks only succeeded and failed as terminal', () => {
    expect(isTerminalActionState('idle')).toBe(false)
    expect(isTerminalActionState('pending')).toBe(false)
    expect(isTerminalActionState('succeeded')).toBe(true)
    expect(isTerminalActionState('failed')).toBe(true)
  })
})
