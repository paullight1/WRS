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
} from '../../domain/robot/types'
import type { RobotRepository } from '../../services/robot/RobotService'

export interface RobotServerPort {
  call<T>(operation: string, payload: Record<string, unknown>): Promise<T>
}

export class SupabaseRobotRepository implements RobotRepository {
  constructor(private readonly port: RobotServerPort) {}

  getOnboardingDraft(userId: string) {
    return this.port.call<OnboardingDraft | null>('robot.onboarding.get', { userId })
  }

  saveOnboardingDraft(userId: string, draft: OnboardingDraft) {
    return this.port.call<OnboardingDraft>('robot.onboarding.save', { userId, draft })
  }

  completeOnboardingAtomically(
    userId: string,
    input: OnboardingCompletionInput,
    idempotencyKey: string,
  ) {
    return this.port.call<OnboardingCompletionResult>('robot.onboarding.completeAtomic', {
      userId,
      input,
      idempotencyKey,
      requireActiveEntitlement: true,
    })
  }

  getRobotOwned(userId: string, robotId: string) {
    return this.port.call<RobotRecord | null>('robot.getOwned', { userId, robotId })
  }

  getActiveRobot(userId: string) {
    return this.port.call<{ robot: RobotRecord; configuration: RobotConfiguration } | null>(
      'robot.getActive',
      { userId },
    )
  }

  saveConfigurationAtomically(
    userId: string,
    robotId: string,
    input: RobotConfigurationInput,
    expectedVersion: number,
  ) {
    return this.port.call<ConfigurationSaveResult>('robot.configuration.saveAtomic', {
      userId,
      robotId,
      input,
      expectedVersion,
      enforceEntitlements: true,
    })
  }

  getPassportOwned(userId: string, robotId: string) {
    return this.port.call<RobotPassport | null>('robot.passport.getOwned', { userId, robotId })
  }

  requestPassportPdf(userId: string, robotId: string) {
    return this.port.call<PassportPdfDescriptor | null>('robot.passport.pdf', {
      userId,
      robotId,
      privacySafe: true,
    })
  }

  appendXpEvent(event: XpEvent) {
    return this.port.call<XpEvent>('robot.xp.appendIdempotent', { event })
  }

  getXpEvents(userId: string, robotId: string) {
    return this.port.call<XpEvent[]>('robot.xp.listOwned', { userId, robotId })
  }
}
