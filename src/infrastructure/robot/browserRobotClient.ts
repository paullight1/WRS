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
} from '../../domain/robot/types'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('Robot service returned an invalid response.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Robot request failed.')
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Robot service returned an invalid response.')
  }
  return body as T
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

export const browserRobotClient = {
  async active() {
    const result = await request<unknown>('/api/robot')
    if (
      !isRecord(result) ||
      !('robot' in result) ||
      !('configuration' in result) ||
      (result.robot !== null && !isRecord(result.robot)) ||
      (result.configuration !== null && !isRecord(result.configuration))
    ) {
      throw new Error('Robot service returned an invalid robot response.')
    }
    return result as { robot: RobotRecord | null; configuration: RobotConfiguration | null }
  },
  async onboarding() {
    const result = await request<unknown>('/api/robot/onboarding')
    if (!isRecord(result) || !('draft' in result) || (result.draft !== null && !isRecord(result.draft))) {
      throw new Error('Robot service returned an invalid onboarding response.')
    }
    return result as { draft: OnboardingDraft | null }
  },
  async saveOnboarding(draft: OnboardingDraft) {
    const result = await request<unknown>('/api/robot/onboarding', {
      method: 'PUT',
      body: JSON.stringify({ draft }),
    })
    if (!isRecord(result) || !isRecord(result.draft)) {
      throw new Error('Robot service returned an invalid onboarding response.')
    }
    return result as { draft: OnboardingDraft }
  },
  completeOnboarding: (input: OnboardingCompletionInput, idempotencyKey: string) =>
    request<OnboardingCompletionResult>('/api/robot/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ input, idempotencyKey }),
    }),
  saveConfiguration: (robotId: string, input: RobotConfigurationInput, expectedVersion: number) =>
    request<ConfigurationSaveResult>('/api/robot/configuration', {
      method: 'PUT',
      body: JSON.stringify({ robotId, input, expectedVersion }),
    }),
  passport: (robotId: string) =>
    request<{ passport: RobotPassport }>(`/api/robot/passport?robotId=${encodeURIComponent(robotId)}`),
  passportPdf: (robotId: string) =>
    request<PassportPdfDescriptor>(`/api/robot/passport/pdf?robotId=${encodeURIComponent(robotId)}`, {
      method: 'POST',
      body: '{}',
    }),
}
