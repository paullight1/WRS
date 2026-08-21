import { describe, expect, it } from 'vitest'
import { hasCapability, packageDefinition, tierAtLeast } from '../../src/domain/robot/packages'

describe('robot package capabilities', () => {
  it('orders all six WRS package tiers', () => {
    expect(tierAtLeast('visionary', 'starter')).toBe(true)
    expect(tierAtLeast('enterprise', 'professional')).toBe(true)
    expect(tierAtLeast('starter', 'builder')).toBe(false)
  })

  it('centralizes capability decisions instead of trusting UI labels', () => {
    expect(hasCapability('professional', 'voice.custom')).toBe(true)
    expect(hasCapability('starter', 'voice.custom')).toBe(false)
    expect(hasCapability('enterprise', 'deployment.regulated')).toBe(true)
    expect(hasCapability('builder', 'deployment.regulated')).toBe(false)
  })

  it('preserves authoritative package price and robot-class metadata', () => {
    expect(packageDefinition('starter')).toMatchObject({ priceUsd: 20, robotClass: 'Explorer Robot' })
    expect(packageDefinition('visionary')).toMatchObject({ priceUsd: 1000, robotClass: 'Visionary Robot' })
  })
})
