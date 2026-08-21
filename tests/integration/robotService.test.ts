import { describe, expect, it, vi } from 'vitest'
import { RobotService, type RobotRepository } from '../../src/services/robot/RobotService'
import type {
  ConfigurationSaveResult,
  OnboardingCompletionInput,
  RobotConfiguration,
  RobotRecord,
  XpEvent,
} from '../../src/domain/robot/types'

const robot: RobotRecord = {
  id: 'robot-1',
  ownerUserId: 'user-1',
  name: 'WRS-Pro-001',
  lifecycle: 'active',
  packageSlug: 'professional',
  requestedPackageSlug: 'professional',
  publicVerificationId: 'passport-1',
  activationDate: '2026-08-21T06:00:00.000Z',
  createdAt: '2026-08-21T06:00:00.000Z',
  updatedAt: '2026-08-21T06:00:00.000Z',
}

const configuration: RobotConfiguration = {
  robotId: robot.id,
  version: 2,
  palette: 'Oceania Flow',
  parts: { head: 'standard', torso: 'standard' },
  personality: 'Logical',
  tuning: { speed: 70, battery: 75, sensor: 68 },
  voiceProfileId: 'standard-en',
  updatedAt: '2026-08-21T06:00:00.000Z',
}

const onboarding: OnboardingCompletionInput = {
  name: robot.name,
  requestedPackageSlug: 'professional',
  palette: configuration.palette,
  parts: configuration.parts,
  personality: configuration.personality,
  tuning: configuration.tuning,
  voiceProfileId: configuration.voiceProfileId,
}

function repository(overrides: Partial<RobotRepository> = {}): RobotRepository {
  const xp: XpEvent[] = []
  return {
    getOnboardingDraft: vi.fn().mockResolvedValue(null),
    saveOnboardingDraft: vi.fn(async (_userId, draft) => draft),
    completeOnboardingAtomically: vi.fn().mockResolvedValue({ status: 'completed', robot, configuration }),
    getRobotOwned: vi.fn().mockResolvedValue(robot),
    getActiveRobot: vi.fn().mockResolvedValue({ robot, configuration }),
    saveConfigurationAtomically: vi
      .fn()
      .mockResolvedValue({ status: 'saved', configuration } satisfies ConfigurationSaveResult),
    getPassportOwned: vi.fn().mockResolvedValue(null),
    requestPassportPdf: vi.fn().mockResolvedValue(null),
    appendXpEvent: vi.fn(async (event) => {
      xp.push(event)
      return event
    }),
    getXpEvents: vi.fn(async () => [...xp]),
    ...overrides,
  }
}

describe('RobotService', () => {
  it('rejects invalid onboarding before persistence', async () => {
    const repo = repository()
    await expect(
      new RobotService(repo).completeOnboarding('user-1', { ...onboarding, name: 'x' }, 'onboard:user-1'),
    ).rejects.toThrow(/robot name/i)
    expect(repo.completeOnboardingAtomically).not.toHaveBeenCalled()
  })

  it('passes the idempotency key to one atomic onboarding operation', async () => {
    const repo = repository()
    const result = await new RobotService(repo).completeOnboarding('user-1', onboarding, 'onboard:user-1')
    expect(result.status).toBe('completed')
    expect(repo.completeOnboardingAtomically).toHaveBeenCalledTimes(1)
    expect(repo.completeOnboardingAtomically).toHaveBeenCalledWith('user-1', onboarding, 'onboard:user-1')
  })

  it('propagates entitlement-required instead of activating an unpaid selection', async () => {
    const repo = repository({
      completeOnboardingAtomically: vi.fn().mockResolvedValue({
        status: 'entitlement-required',
        packageSlug: 'professional',
      }),
    })
    const result = await new RobotService(repo).completeOnboarding('user-1', onboarding, 'onboard:user-1')
    expect(result).toEqual({ status: 'entitlement-required', packageSlug: 'professional' })
  })

  it('rejects configuration writes for another users robot', async () => {
    const repo = repository({ getRobotOwned: vi.fn().mockResolvedValue(null) })
    const result = await new RobotService(repo).saveConfiguration('user-2', robot.id, configuration, 2)
    expect(result).toEqual({ status: 'forbidden' })
    expect(repo.saveConfigurationAtomically).not.toHaveBeenCalled()
  })

  it('rejects package-locked custom voice capability', async () => {
    const starter = { ...robot, packageSlug: 'starter' as const }
    const repo = repository({ getRobotOwned: vi.fn().mockResolvedValue(starter) })
    const result = await new RobotService(repo).saveConfiguration(
      'user-1',
      robot.id,
      { ...configuration, voiceProfileId: 'custom-voice' },
      2,
    )
    expect(result).toEqual({ status: 'capability-locked', capability: 'voice.custom' })
  })

  it('propagates optimistic version conflicts for UI rollback/reload', async () => {
    const repo = repository({
      saveConfigurationAtomically: vi.fn().mockResolvedValue({ status: 'conflict', current: configuration }),
    })
    const result = await new RobotService(repo).saveConfiguration('user-1', robot.id, configuration, 1)
    expect(result).toEqual({ status: 'conflict', current: configuration })
  })

  it('requires ownership before awarding XP and rejects a second reversal', async () => {
    const noOwner = repository({ getRobotOwned: vi.fn().mockResolvedValue(null) })
    await expect(
      new RobotService(noOwner).awardXp({
        id: 'xp-1',
        robotId: robot.id,
        userId: 'user-2',
        source: 'training',
        amount: 100,
        referenceType: 'lesson',
        referenceId: 'lesson-1',
        idempotencyKey: 'lesson-1:user-2',
        createdAt: '2026-08-21T06:00:00.000Z',
      }),
    ).rejects.toThrow(/not owned/i)

    const repo = repository()
    const service = new RobotService(repo)
    await service.awardXp({
      id: 'xp-1',
      robotId: robot.id,
      userId: 'user-1',
      source: 'training',
      amount: 100,
      referenceType: 'lesson',
      referenceId: 'lesson-1',
      idempotencyKey: 'lesson-1:user-1',
      createdAt: '2026-08-21T06:00:00.000Z',
    })
    await service.reverseXp('user-1', robot.id, 'xp-1', 'reverse-1', 'reverse:xp-1', '2026-08-21T06:10:00.000Z')
    await expect(
      service.reverseXp('user-1', robot.id, 'xp-1', 'reverse-2', 'reverse:xp-1:again', '2026-08-21T06:11:00.000Z'),
    ).rejects.toThrow(/already reversed/i)
  })
})
