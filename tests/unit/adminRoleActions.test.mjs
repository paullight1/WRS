// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../api/_lib/http.js'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  serviceRpc: vi.fn(),
  serviceRest: vi.fn(),
  authSecret: vi.fn(),
}))
vi.mock('../../api/_lib/session.js', () => ({ requireSession: mocks.requireSession }))
vi.mock('../../api/_lib/supabase.js', () => ({
  serviceRpc: mocks.serviceRpc,
  serviceRest: mocks.serviceRest,
  authSecret: mocks.authSecret,
  authPublic: vi.fn(),
}))

import action from '../../server/routes/admin/action.js'
import roleSubject from '../../server/routes/admin/role-subject.js'
import { bootstrapInitialAdmin } from '../../scripts/bootstrap-initial-admin.mjs'

const actor = '11111111-1111-4111-8111-111111111111'
const subject = '22222222-2222-4222-8222-222222222222'
const roleCalls = () => mocks.serviceRpc.mock.calls.filter(([name]) => name === 'wrs_admin_set_operator_role')
function request(body, origin = 'https://wrs.example') {
  return new Request('https://wrs.example/api/admin/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}
const valid = { action: 'role.grant', userId: subject, role: 'reward_operator', reason: 'Approved staffing request' }
beforeEach(() => {
  mocks.requireSession.mockResolvedValue({
    user: { id: actor },
    session: { mfaEnabled: true, mfaSatisfiedAt: new Date().toISOString() },
    cookies: [],
  })
  mocks.serviceRpc.mockImplementation(async (name, args) => {
    if (name === 'wrs_operator_has_permission') return { data: true }
    if (name === 'wrs_admin_role_subject')
      return { data: { userId: subject, identifier: args.p_identifier, roles: ['reward_operator'] } }
    return { data: { userId: subject, role: args.p_role_slug, enabled: args.p_enabled, changed: true, auditId: 7 } }
  })
})

describe('admin role actions', () => {
  it.each(['role.grant', 'role.revoke'])(
    'authorizes %s with MFA and forwards the verified actor to the atomic RPC',
    async (name) => {
      const response = await action.fetch(request({ ...valid, action: name, operatorUserId: subject }))
      expect(response.status).toBe(200)
      expect(mocks.serviceRpc).toHaveBeenCalledWith('wrs_operator_has_permission', {
        p_user_id: actor,
        p_permission: 'operations.roles',
      })
      expect(roleCalls()).toEqual([
        [
          'wrs_admin_set_operator_role',
          {
            p_operator_user_id: actor,
            p_subject_user_id: subject,
            p_role_slug: 'reward_operator',
            p_enabled: name === 'role.grant',
            p_reason: valid.reason,
          },
        ],
      ])
      expect(await response.json()).toMatchObject({ changed: true, auditId: 7 })
    },
  )
  it('preserves rotated session cookies after a successful role change', async () => {
    mocks.requireSession.mockResolvedValue({
      user: { id: actor },
      session: { mfaEnabled: true, mfaSatisfiedAt: new Date().toISOString() },
      cookies: ['wrs_session=rotated; Path=/; HttpOnly; Secure; SameSite=Lax'],
    })
    const response = await action.fetch(request(valid))
    expect(response.headers.get('set-cookie')).toContain('wrs_session=rotated')
  })
  it('rejects unauthenticated callers before mutation', async () => {
    mocks.requireSession.mockRejectedValue(new HttpError(401, 'Sign in required.', 'session-required'))
    expect((await action.fetch(request(valid))).status).toBe(401)
    expect(roleCalls()).toHaveLength(0)
  })
  it('rejects non-admin permission denial before mutation', async () => {
    mocks.serviceRpc.mockResolvedValue({ data: false })
    expect((await action.fetch(request(valid))).status).toBe(403)
    expect(roleCalls()).toHaveLength(0)
  })
  it.each([{}, { mfaEnabled: true, mfaSatisfiedAt: new Date(Date.now() - 11 * 60_000).toISOString() }])(
    'rejects missing or stale MFA',
    async (session) => {
      mocks.requireSession.mockResolvedValue({ user: { id: actor }, session })
      const response = await action.fetch(request(valid))
      expect(response.status).toBe(403)
      expect((await response.json()).code).toBe('mfa-step-up-required')
      expect(roleCalls()).toHaveLength(0)
    },
  )
  it.each([
    { userId: actor },
    { role: 'admin' },
    { role: 'member' },
    { role: 'unknown' },
    { role: 'reward_operator '.repeat(10) },
    { reason: '  ' },
    { userId: 'not-a-uuid' },
  ])('rejects invalid or unsafe targets without mutation: %j', async (patch) => {
    expect((await action.fetch(request({ ...valid, ...patch }))).status).toBeGreaterThanOrEqual(400)
    expect(roleCalls()).toHaveLength(0)
  })
  it('rejects cross-origin mutations', async () => {
    expect((await action.fetch(request(valid, 'https://attacker.example'))).status).toBe(403)
    expect(roleCalls()).toHaveLength(0)
  })
})

describe('exact role subject lookup', () => {
  it('denies lookup when the role-management permission is absent', async () => {
    mocks.serviceRpc.mockResolvedValue({ data: false })
    expect(
      (await roleSubject.fetch(new Request(`https://wrs.example/api/admin/role-subject?identifier=${subject}`))).status,
    ).toBe(403)
    expect(mocks.serviceRpc.mock.calls.filter(([name]) => name === 'wrs_admin_role_subject')).toHaveLength(0)
  })
  it.each(['member@example.test', subject])('looks up only the exact supplied identifier %s', async (identifier) => {
    const response = await roleSubject.fetch(
      new Request(`https://wrs.example/api/admin/role-subject?identifier=${encodeURIComponent(identifier)}`),
    )
    expect(response.status).toBe(200)
    expect(mocks.serviceRpc).toHaveBeenCalledWith('wrs_admin_role_subject', {
      p_operator_user_id: actor,
      p_identifier: identifier,
    })
    expect(mocks.serviceRest).not.toHaveBeenCalled()
    expect(Object.keys(await response.json()).sort()).toEqual(['identifier', 'roles', 'userId'])
  })
  it.each(['', 'member', '*@example.test'])('rejects missing and partial identifiers %s', async (identifier) => {
    expect(
      (
        await roleSubject.fetch(
          new Request(`https://wrs.example/api/admin/role-subject?identifier=${encodeURIComponent(identifier)}`),
        )
      ).status,
    ).toBe(400)
    expect(mocks.serviceRpc.mock.calls.filter(([name]) => name === 'wrs_admin_role_subject')).toHaveLength(0)
  })
  it('requires operations.roles and reports absent targets', async () => {
    mocks.serviceRpc.mockImplementation(async (name) => ({
      data: name === 'wrs_operator_has_permission' ? true : null,
    }))
    expect(
      (await roleSubject.fetch(new Request(`https://wrs.example/api/admin/role-subject?identifier=${subject}`))).status,
    ).toBe(404)
    expect(mocks.serviceRpc).toHaveBeenCalledWith('wrs_operator_has_permission', {
      p_user_id: actor,
      p_permission: 'operations.roles',
    })
  })
})

describe('initial-admin bootstrap', () => {
  const env = {
    SUPABASE_URL: 'https://expectedref.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-secret',
    WRS_EXPECTED_PROJECT_REF: 'expectedref',
    WRS_INITIAL_ADMIN_USER_ID: subject,
  }
  it.each([
    { SUPABASE_URL: '' },
    { SUPABASE_SERVICE_ROLE_KEY: '' },
    { WRS_EXPECTED_PROJECT_REF: '' },
    { WRS_INITIAL_ADMIN_USER_ID: '' },
    { WRS_INITIAL_ADMIN_USER_ID: 'bad' },
    { SUPABASE_URL: 'https://otherref.supabase.co' },
    { SUPABASE_URL: 'http://expectedref.supabase.co' },
    { SUPABASE_URL: 'https://expectedref.supabase.co.attacker.test' },
  ])('refuses invalid configuration before network calls %j', async (patch) => {
    const fetcher = vi.fn()
    await expect(bootstrapInitialAdmin({ ...env, ...patch }, fetcher)).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('calls only the one-time RPC with an explicit subject and reason', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ userId: subject, role: 'admin', auditId: 1 }), { status: 200 }))
    await expect(bootstrapInitialAdmin(env, fetcher)).resolves.toMatchObject({ role: 'admin', auditId: 1 })
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe(`${env.SUPABASE_URL}/rest/v1/rpc/wrs_bootstrap_initial_admin`)
    expect(JSON.parse(init.body)).toEqual({
      p_subject_user_id: subject,
      p_reason: 'Trusted project-owner initial administrator bootstrap',
    })
  })
  it('hides malformed provider responses that might contain secrets', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('invalid json test-secret', { status: 200 }))
    await expect(bootstrapInitialAdmin(env, fetcher)).rejects.toThrow(
      'Bootstrap result could not be read; inspect the trusted project audit before retrying.',
    )
  })
  it.each(['an administrator already exists', 'target account does not exist'])(
    'refuses RPC rejection and hides provider details: %s',
    async (message) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message, secret: env.SUPABASE_SERVICE_ROLE_KEY }), { status: 400 }),
        )
      await expect(bootstrapInitialAdmin(env, fetcher)).rejects.toThrow('Bootstrap refused by the database')
      expect(fetcher).toHaveBeenCalledTimes(1)
    },
  )
})
