import type { AuthSession, OAuthProvider, RegistrationInput, VerificationKind } from '../../domain/auth/types'

type Json = Record<string, unknown>

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Authentication request failed.')
  return body as T
}

export const browserAuthClient = {
  session: () => request<{ session: AuthSession | null }>('/api/auth/session'),
  register: (input: RegistrationInput) => request<Json>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (identifier: string, password: string, rememberMe: boolean) => request<{ session: AuthSession }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password, rememberMe }) }),
  logout: () => request<Json>('/api/auth/logout', { method: 'POST', body: '{}' }),
  verify: (userId: string, challengeId: string, kind: VerificationKind, code: string) => request<{ session: AuthSession }>('/api/auth/verify', { method: 'POST', body: JSON.stringify({ userId, challengeId, kind, code }) }),
  requestPasswordReset: (identifier: string) => request<Json>('/api/auth/password/forgot', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resetPassword: (token: string, password: string) => request<Json>('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),
  beginOAuth: (provider: OAuthProvider) => request<{ authorizationUrl: string }>('/api/auth/oauth/start', { method: 'POST', body: JSON.stringify({ provider }) }),
  enrollMfa: () => request<Json>('/api/auth/mfa/enroll', { method: 'POST', body: '{}' }),
  verifyMfa: (enrollmentId: string, code: string) => request<{ session: AuthSession }>('/api/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ enrollmentId, code }) }),
}
