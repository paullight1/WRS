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
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Robot request failed.')
  return body as T
}

export const browserRobotClient = {
  active: () => request<{ robot: RobotRecord | null; configuration: RobotConfiguration | null }>('/api/robot'),
  onboarding: () => request<{ draft: OnboardingDraft | null }>('/api/robot/onboarding'),
  saveOnboarding: (draft: OnboardingDraft) =>
    request<{ draft: OnboardingDraft }>('/api/robot/onboarding', {
      method: 'PUT',
      body: JSON.stringify({ draft }),
    }),
  completeOnboarding: (input: OnboardingCompletionInput, idempotencyKey: string) =>
    request<OnboardingCompletionResult>('/api/robot/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ input, idempotencyKey }),
    }),
  saveConfiguration: (robotId: string, input: RobotConfigurationInput, expectedVersion: number) =>
    request<ConfigurationSaveResult>(`/api/robots/${encodeURIComponent(robotId)}/configuration`, {
      method: 'PUT',
      body: JSON.stringify({ input, expectedVersion }),
    }),
  passport: (robotId: string) =>
    request<{ passport: RobotPassport }>(`/api/robots/${encodeURIComponent(robotId)}/passport`),
  passportPdf: (robotId: string) =>
    request<PassportPdfDescriptor>(`/api/robots/${encodeURIComponent(robotId)}/passport/pdf`, {
      method: 'POST',
      body: '{}',
    }),
}
