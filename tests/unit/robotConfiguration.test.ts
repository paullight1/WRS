import { describe, expect, it } from 'vitest'
import { requiredCapabilities, validateOnboardingCompletion, validateRobotConfiguration } from '../../src/domain/robot/configuration'

const base = {
  palette: 'Oceania Flow',
  parts: { head: 'standard', torso: 'standard' },
  personality: 'Logical',
  tuning: { speed: 70, battery: 75, sensor: 68 },
  voiceProfileId: 'standard-en',
}

describe('robot configuration', () => {
  it('rejects invalid names and tuning outside 0–100', () => {
    const issues = validateOnboardingCompletion({
      ...base,
      name: 'x',
      requestedPackageSlug: 'professional',
      tuning: { ...base.tuning, speed: 101 },
    })
    expect(issues.map((issue) => issue.code)).toContain('invalid-name')
    expect(issues.map((issue) => issue.code)).toContain('invalid-tuning')
  })

  it('requires complete configuration values', () => {
    expect(validateRobotConfiguration({ ...base, palette: '' }).map((issue) => issue.field)).toContain('palette')
    expect(validateRobotConfiguration({ ...base, parts: {} }).map((issue) => issue.field)).toContain('parts')
  })

  it('derives restricted capabilities from selected configuration', () => {
    expect(requiredCapabilities({ ...base, voiceProfileId: 'custom-voice' })).toContain('voice.custom')
    expect(requiredCapabilities({ ...base, tuning: { ...base.tuning, speed: 95 } })).toContain('tuning.advanced')
    expect(requiredCapabilities({ ...base, parts: { head: 'elite-vision' } })).toContain('robot.elite-modules')
  })
})
