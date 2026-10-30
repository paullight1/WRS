import { beforeEach, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ requireAdminSession: vi.fn() }))
const database = vi.hoisted(() => ({ serviceRest: vi.fn() }))
const storage = vi.hoisted(() => ({ createSignedDownloadUrl: vi.fn() }))

vi.mock('../../../api/_lib/account.js', () => account)
vi.mock('../../../api/_lib/supabase.js', () => database)
vi.mock('../../../api/_lib/storage.js', () => storage)

import dataFile from '../../../server/routes/admin/data-file.js'

const assetId = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  vi.clearAllMocks()
  account.requireAdminSession.mockResolvedValue({ user: { id: 'operator-1' }, cookies: [] })
  database.serviceRest.mockResolvedValue({
    data: [
      {
        id: assetId,
        storage_bucket: 'wrs-private-data',
        storage_path: 'private/member/file.txt',
        status: 'submitted',
        scan_status: 'clean',
      },
    ],
  })
  storage.createSignedDownloadUrl.mockResolvedValue('https://storage.example/signed?token=short-lived')
})

it('requires the data permission and redirects to a short-lived signed URL without exposing storage paths', async () => {
  const response = await dataFile.fetch(new Request(`https://wrs.test/api/admin/data-file?assetId=${assetId}`))

  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toBe('https://storage.example/signed?token=short-lived')
  expect(account.requireAdminSession).toHaveBeenCalledWith(expect.any(Request), 'operations.data')
  expect(database.serviceRest).toHaveBeenCalledWith(
    expect.stringContaining(
      `id=eq.${assetId}&status=in.(submitted,processing,review,approved,rejected)&scan_status=eq.clean`,
    ),
  )
  expect(storage.createSignedDownloadUrl).toHaveBeenCalledWith('wrs-private-data', 'private/member/file.txt', 300)
})

it('does not sign a deleted or unclean asset', async () => {
  database.serviceRest.mockResolvedValueOnce({ data: [] })

  const response = await dataFile.fetch(new Request(`https://wrs.test/api/admin/data-file?assetId=${assetId}`))

  expect(response.status).toBe(404)
  expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled()
})

it('rejects malformed asset identifiers before a storage lookup', async () => {
  const response = await dataFile.fetch(new Request('https://wrs.test/api/admin/data-file?assetId=not-a-uuid'))

  expect(response.status).toBe(400)
  expect(database.serviceRest).not.toHaveBeenCalled()
  expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled()
})

it('does not sign a clean file that has not been submitted for review', async () => {
  database.serviceRest.mockResolvedValueOnce({
    data: [
      { id: assetId, status: 'uploaded', scan_status: 'clean', storage_bucket: 'private', storage_path: 'draft.txt' },
    ],
  })
  const response = await dataFile.fetch(new Request(`https://wrs.test/api/admin/data-file?assetId=${assetId}`))
  expect(response.status).toBe(404)
  expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled()
})
