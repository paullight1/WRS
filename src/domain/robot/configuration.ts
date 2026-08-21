import type { OnboardingCompletionInput, RobotConfigurationInput } from './types'
import { isPackageSlug } from './packages'

const ROBOT_NAME = /^[A-Za-z0-9][A-Za-z0-9 _.-]{2,31}$/

export interface RobotValidationIssue {
  field: string
  code: string
  message: string
}

export function validateRobotName(name: string): RobotValidationIssue[] {
  const value = name.trim()
  if (!ROBOT_NAME.test(value)) {
    return [
      {
        field: 'name',
        code: 'invalid-name',
        message: 'Robot name must be 3–32 characters and use letters, numbers, spaces, dots, dashes or underscores.',
      },
    ]
  }
  return []
}

export function validateRobotConfiguration(
  input: RobotConfigurationInput,
): RobotValidationIssue[] {
  const issues: RobotValidationIssue[] = []
  if (!input.palette.trim()) {
    issues.push({ field: 'palette', code: 'required', message: 'Choose a palette.' })
  }
  if (!input.personality.trim()) {
    issues.push({ field: 'personality', code: 'required', message: 'Choose a personality.' })
  }
  if (!input.voiceProfileId.trim()) {
    issues.push({ field: 'voiceProfileId', code: 'required', message: 'Choose a voice profile.' })
  }
  if (!Object.keys(input.parts).length || Object.values(input.parts).some((value) => !value.trim())) {
    issues.push({ field: 'parts', code: 'invalid-parts', message: 'Robot parts must be complete.' })
  }
  for (const [key, value] of Object.entries(input.tuning)) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      issues.push({ field: `tuning.${key}`, code: 'invalid-tuning', message: 'Tuning values must be between 0 and 100.' })
    }
  }
  return issues
}

export function validateOnboardingCompletion(
  input: OnboardingCompletionInput,
): RobotValidationIssue[] {
  const issues = [...validateRobotName(input.name), ...validateRobotConfiguration(input)]
  if (!isPackageSlug(input.requestedPackageSlug)) {
    issues.push({ field: 'requestedPackageSlug', code: 'invalid-package', message: 'Choose a supported package.' })
  }
  return issues
}

export function requiredCapabilities(input: RobotConfigurationInput): string[] {
  const required = new Set<string>(['robot.core'])
  if (input.voiceProfileId.toLowerCase().includes('custom')) required.add('voice.custom')
  if (Object.values(input.tuning).some((value) => value > 90)) required.add('tuning.advanced')
  if (Object.values(input.parts).some((value) => value.toLowerCase().includes('elite'))) {
    required.add('robot.elite-modules')
  }
  if (Object.values(input.parts).some((value) => value.toLowerCase().includes('visionary'))) {
    required.add('robot.visionary-modules')
  }
  return [...required]
}
