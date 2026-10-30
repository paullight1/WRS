import { beforeEach, expect, it, vi } from 'vitest'
const account = vi.hoisted(() => ({ requireAdminSession: vi.fn() }))
const database = vi.hoisted(() => ({ serviceRest: vi.fn() }))
vi.mock('../../../api/_lib/account.js', () => account)
vi.mock('../../../api/_lib/supabase.js', () => database)
import handler from '../../../server/routes/admin/support-thread.js'
import { HttpError } from '../../../api/_lib/http.js'
const ticketId = '11111111-1111-4111-8111-111111111111'
const author = '22222222-2222-4222-8222-222222222222'
const messages = Array.from({ length: 51 }, (_, index) => ({
  id: `33333333-3333-4333-8333-${String(100 - index).padStart(12, '0')}`,
  author_user_id: author,
  author_role: 'operator',
  body: `Message ${index}`,
  created_at: '2026-10-30T12:00:00.123456Z',
}))
beforeEach(() => {
  vi.clearAllMocks()
  account.requireAdminSession.mockResolvedValue({ cookies: ['wrs_at=rotated; Path=/; HttpOnly'] })
  database.serviceRest.mockImplementation(async (path) => ({
    data: path.includes('support_tickets?')
      ? [{ id: ticketId }]
      : path.includes('user_profiles?')
        ? [{ user_id: author, full_name: 'Ada Support' }]
        : messages,
  }))
})
it('loads the latest ticket messages in reading order with a stable older-page cursor', async () => {
  const response = await handler.fetch(new Request(`https://wrs.test/api/admin/support-thread?ticketId=${ticketId}`))
  expect(response.status).toBe(200)
  const result = await response.json()
  expect(account.requireAdminSession).toHaveBeenCalledWith(expect.any(Request), 'operations.support')
  expect(result.messages).toHaveLength(50)
  expect(result.messages[0]).toMatchObject({ id: messages[49].id, author_name: 'Ada Support' })
  expect(result.messages.at(-1).id).toBe(messages[0].id)
  expect(result.before).toEqual({ id: messages[49].id, time: messages[49].created_at })
  expect(result.hasMore).toBe(true)
  expect(response.headers.get('set-cookie')).toContain('wrs_at=rotated')
})
it('keeps equal timestamps distinct when requesting earlier messages', async () => {
  const params = new URLSearchParams({ ticketId, beforeId: messages[49].id, beforeTime: messages[49].created_at })
  await handler.fetch(new Request(`https://wrs.test/api/admin/support-thread?${params}`))
  const path = database.serviceRest.mock.calls.find(([path]) => path.includes('support_messages?'))[0]
  const query = new URL(path, 'https://database.test').searchParams
  expect(query.get('or')).toBe(
    `(created_at.lt.${messages[49].created_at},and(created_at.eq.${messages[49].created_at},id.lt.${messages[49].id}))`,
  )
})
it('rejects malformed cursors before reading any ticket or messages', async () => {
  const response = await handler.fetch(
    new Request(`https://wrs.test/api/admin/support-thread?ticketId=${ticketId}&beforeId=invalid&beforeTime=invalid`),
  )
  expect(response.status).toBe(400)
  expect(database.serviceRest).not.toHaveBeenCalled()
})
it('denies message access without the support permission', async () => {
  account.requireAdminSession.mockRejectedValueOnce(new HttpError(403, 'Support access required.'))
  const response = await handler.fetch(new Request(`https://wrs.test/api/admin/support-thread?ticketId=${ticketId}`))
  expect(response.status).toBe(403)
  expect(database.serviceRest).not.toHaveBeenCalled()
})
