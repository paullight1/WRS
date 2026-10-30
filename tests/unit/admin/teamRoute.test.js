import { beforeEach, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ requireAdminSession: vi.fn() }))
const database = vi.hoisted(() => ({ serviceRest: vi.fn() }))
vi.mock('../../../api/_lib/account.js', () => account)
vi.mock('../../../api/_lib/supabase.js', () => database)

import team from '../../../server/routes/admin/team.js'

const actor = '11111111-1111-4111-8111-111111111111'
const supportRole = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const adminRole = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

beforeEach(() => {
  vi.clearAllMocks()
  account.requireAdminSession.mockResolvedValue({ user: { id: actor }, cookies: [] })
  database.serviceRest.mockImplementation(async (path) => {
    if (path.includes('/roles?'))
      return {
        data: [
          { id: supportRole, slug: 'support_operator' },
          { id: adminRole, slug: 'admin' },
        ],
      }
    if (path.includes('/user_roles?'))
      return {
        response: { headers: new Headers({ 'content-range': '0-2/3' }) },
        data: [
          { user_id: '22222222-2222-4222-8222-222222222222', role_id: supportRole },
          { user_id: '22222222-2222-4222-8222-222222222222', role_id: adminRole },
          { user_id: '33333333-3333-4333-8333-333333333333', role_id: supportRole },
        ],
      }
    return {
      response: { headers: new Headers({ 'content-range': '0-1/2' }) },
      data: [
        {
          user_id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Ada Okafor',
          normalized_email: 'ada@example.com',
          status: 'active',
        },
        {
          user_id: '33333333-3333-4333-8333-333333333333',
          full_name: 'Kwame Mensah',
          normalized_email: 'kwame@example.com',
          status: 'suspended',
        },
      ],
    }
  })
})

it('returns bounded profile-backed staff members and role/status counts', async () => {
  const response = await team.fetch(new Request('https://wrs.test/api/admin/team'))
  expect(response.status).toBe(200)
  expect(account.requireAdminSession).toHaveBeenCalledWith(expect.any(Request), 'operations.roles')
  expect(await response.json()).toEqual({
    members: [
      {
        userId: '22222222-2222-4222-8222-222222222222',
        fullName: 'Ada Okafor',
        email: 'ada@example.com',
        roles: ['admin', 'support_operator'],
      },
      {
        userId: '33333333-3333-4333-8333-333333333333',
        fullName: 'Kwame Mensah',
        email: 'kwame@example.com',
        roles: ['support_operator'],
      },
    ],
    stats: {
      total: 2,
      active: 1,
      pending: 0,
      suspended: 1,
      roleCounts: {
        admin: 1,
        support_operator: 2,
        kyc_operator: 0,
        finance_operator: 0,
        data_operator: 0,
        deployment_operator: 0,
        risk_operator: 0,
        reward_operator: 0,
      },
      scope: 'all',
    },
    hasMore: false,
  })
  const paths = database.serviceRest.mock.calls.map(([path]) => path)
  expect(paths.some((path) => path.includes('/auth/v1/admin/users'))).toBe(false)
  expect(paths.find((path) => path.includes('/user_roles?'))).toContain('limit=4001')
  expect(paths.find((path) => path.includes('/user_profiles?'))).toContain(
    'select=user_id,full_name,normalized_email,status',
  )
})

it('returns an empty, exact directory when the fixed staff roles are unavailable', async () => {
  database.serviceRest.mockResolvedValueOnce({ data: [] })
  const response = await team.fetch(new Request('https://wrs.test/api/admin/team'))
  expect(await response.json()).toEqual({
    members: [],
    stats: { total: 0, active: 0, pending: 0, suspended: 0, roleCounts: {}, scope: 'all' },
    hasMore: false,
  })
  expect(database.serviceRest).toHaveBeenCalledTimes(1)
})

it('labels bounded counts as shown instead of presenting them as global totals', async () => {
  const ids = Array.from(
    { length: 501 },
    (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  )
  database.serviceRest.mockImplementation(async (path) => {
    if (path.includes('/roles?')) return { data: [{ id: supportRole, slug: 'support_operator' }] }
    if (path.includes('/user_roles?')) return { data: ids.map((userId) => ({ user_id: userId, role_id: supportRole })) }
    return {
      data: ids.slice(0, 500).map((userId, index) => ({
        user_id: userId,
        full_name: `Staff ${index + 1}`,
        normalized_email: `staff-${index + 1}@example.com`,
        status: index === 0 ? 'pending' : 'active',
      })),
    }
  })

  const response = await team.fetch(new Request('https://wrs.test/api/admin/team'))
  const body = await response.json()
  expect(body.members).toHaveLength(500)
  expect(body.stats).toMatchObject({ total: 500, active: 499, pending: 1, suspended: 0, scope: 'shown' })
  expect(body.hasMore).toBe(true)
})
