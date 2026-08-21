import {
  requiredCapabilities,
  validateOnboardingCompletion,
  validateRobotConfiguration,
} from '../../domain/robot/configuration'
import { hasCapability } from '../../domain/robot/packages'
import { createReversalEvent, projectXpEvents, validateXpAward } from '../../domain/robot/progression'
import type {
  ConfigurationSaveResult,
  OnboardingCompletionInput,
  OnboardingCompletionResult,
  OnboardingDraft,
  PassportPdfDescriptor,
  RobotConfiguration,
  RobotConfigurationInput,
  RobotPassport,
  RobotRecord,
  XpEvent,
  XpSource,
} from '../../domain/robot/types'

export interface RobotRepository {
  getOnboardingDraft(userId: string): Promise<OnboardingDraft | null>
  saveOnboardingDraft(userId: string, draft: OnboardingDraft): Promise<OnboardingDraft>
  completeOnboardingAtomically(
    userId: string,
    input: OnboardingCompletionInput,
    idempotencyKey: string,
  ): Promise<OnboardingCompletionResult>
  getRobotOwned(userId: string, robotId: string): Promise<RobotRecord | null>
  getActiveRobot(userId: string): Promise<{ robot: RobotRecord; configuration: RobotConfiguration } | null>
  saveConfigurationAtomically(
    userId: string,
    robotId: string,
    input: RobotConfigurationInput,
    expectedVersion: number,
  ): Promise<ConfigurationSaveResult>
  getPassportOwned(userId: string, robotId: string): Promise<RobotPassport | null>
  requestPassportPdf(userId: string, robotId: string): Promise<PassportPdfDescriptor | null>
  appendXpEvent(event: XpEvent): Promise<XpEvent>
  getXpEvents(userId: string, robotId: string): Promise<XpEvent[]>
}

export class RobotService {
  constructor(private readonly repository: RobotRepository) {}

  resumeOnboarding(userId: string) {
    return this.repository.getOnboardingDraft(userId)
  }

  saveOnboardingDraft(userId: string, draft: OnboardingDraft) {
    const issues = validateOnboardingCompletion({ ...draft })
    if (draft.step < 0 || draft.step > 5)
      issues.push({ field: 'step', code: 'invalid-step', message: 'Invalid onboarding step.' })
    if (issues.length) throw new Error(issues[0].message)
    return this.repository.saveOnboardingDraft(userId, draft)
  }

  async completeOnboarding(
    userId: string,
    input: OnboardingCompletionInput,
    idempotencyKey: string,
  ): Promise<OnboardingCompletionResult> {
    if (!userId || !idempotencyKey) throw new Error('User and idempotency key are required.')
    const issues = validateOnboardingCompletion(input)
    if (issues.length) throw new Error(issues[0].message)
    return this.repository.completeOnboardingAtomically(userId, input, idempotencyKey)
  }

  getActiveRobot(userId: string) {
    return this.repository.getActiveRobot(userId)
  }

  async saveConfiguration(
    userId: string,
    robotId: string,
    input: RobotConfigurationInput,
    expectedVersion: number,
  ): Promise<ConfigurationSaveResult> {
    const issues = validateRobotConfiguration(input)
    if (issues.length) throw new Error(issues[0].message)
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1)
      throw new Error('A valid configuration version is required.')

    const robot = await this.repository.getRobotOwned(userId, robotId)
    if (!robot) return { status: 'forbidden' }
    for (const capability of requiredCapabilities(input)) {
      if (!hasCapability(robot.packageSlug, capability)) {
        return { status: 'capability-locked', capability }
      }
    }
    return this.repository.saveConfigurationAtomically(userId, robotId, input, expectedVersion)
  }

  async getPassport(userId: string, robotId: string): Promise<RobotPassport | null> {
    const robot = await this.repository.getRobotOwned(userId, robotId)
    if (!robot) return null
    return this.repository.getPassportOwned(userId, robotId)
  }

  async exportPassportPdf(userId: string, robotId: string): Promise<PassportPdfDescriptor | null> {
    const robot = await this.repository.getRobotOwned(userId, robotId)
    if (!robot) return null
    return this.repository.requestPassportPdf(userId, robotId)
  }

  async awardXp(input: {
    id: string
    robotId: string
    userId: string
    source: XpSource
    amount: number
    referenceType: string
    referenceId: string
    idempotencyKey: string
    metadata?: Record<string, unknown>
    createdAt: string
  }): Promise<XpEvent> {
    const issues = validateXpAward(input)
    if (issues.length) throw new Error(`Invalid XP award: ${issues.join(', ')}`)
    const owner = await this.repository.getRobotOwned(input.userId, input.robotId)
    if (!owner) throw new Error('Robot is not owned by this user.')
    return this.repository.appendXpEvent({ ...input, reversalOf: null, metadata: input.metadata ?? {} })
  }

  async reverseXp(
    userId: string,
    robotId: string,
    originalEventId: string,
    reversalEventId: string,
    idempotencyKey: string,
    createdAt: string,
    metadata: Record<string, unknown> = {},
  ): Promise<XpEvent> {
    const events = await this.repository.getXpEvents(userId, robotId)
    const original = events.find((event) => event.id === originalEventId && !event.reversalOf)
    if (!original) throw new Error('Original XP event was not found.')
    if (events.some((event) => event.reversalOf === originalEventId)) throw new Error('XP event is already reversed.')
    const reversal = createReversalEvent(original, reversalEventId, idempotencyKey, createdAt, metadata)
    return this.repository.appendXpEvent(reversal)
  }

  async projectXp(userId: string, robotId: string) {
    return projectXpEvents(await this.repository.getXpEvents(userId, robotId))
  }
}
