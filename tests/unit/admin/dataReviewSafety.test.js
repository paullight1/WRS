import { beforeEach, expect, it, vi } from 'vitest'
const db = vi.hoisted(() => ({ serviceRest: vi.fn(), serviceRpc: vi.fn() }))
vi.mock('../../../api/_lib/supabase.js', () => db)
import { assertReviewableSubmission } from '../../../server/adminDataReview.js'
beforeEach(() => {
  vi.clearAllMocks()
  db.serviceRest.mockImplementation(async (path) => ({
    data: path.includes('data_submissions?')
      ? [{ id: 's1', user_id: 'u1', asset_id: 'a1', status: 'review' }]
      : [
          {
            id: 'a1',
            user_id: 'u1',
            purpose_slug: 'dataset-contribution',
            data_category: 'voice',
            status: 'review',
            scan_status: 'clean',
          },
        ],
  }))
  db.serviceRpc.mockResolvedValue({ data: true })
})
it('checks the submitted owner, file safety and active consent before scoring', async () => {
  await expect(assertReviewableSubmission('s1')).resolves.toBeUndefined()
  expect(db.serviceRpc).toHaveBeenCalledWith('wrs_has_active_consent', {
    p_user_id: 'u1',
    p_purpose_slug: 'dataset-contribution',
    p_data_category: 'voice',
  })
})
it.each(['draft', 'deleted'])('rejects a %s submission before any file or consent check', async (status) => {
  db.serviceRest.mockResolvedValueOnce({ data: [{ id: 's1', status }] })
  await expect(assertReviewableSubmission('s1')).rejects.toMatchObject({ status: 409 })
  expect(db.serviceRpc).not.toHaveBeenCalled()
})
it.each([
  { status: 'review', scan_status: 'infected', user_id: 'u1' },
  { status: 'deleted', scan_status: 'clean', user_id: 'u1' },
  { status: 'review', scan_status: 'clean', user_id: 'other-user' },
])('rejects unavailable, unsafe or mismatched files', async (asset) => {
  db.serviceRest
    .mockResolvedValueOnce({ data: [{ id: 's1', user_id: 'u1', asset_id: 'a1', status: 'review' }] })
    .mockResolvedValueOnce({ data: [asset] })
  await expect(assertReviewableSubmission('s1')).rejects.toMatchObject({ status: 409 })
  expect(db.serviceRpc).not.toHaveBeenCalled()
})
it('rejects withdrawn consent', async () => {
  db.serviceRpc.mockResolvedValueOnce({ data: false })
  await expect(assertReviewableSubmission('s1')).rejects.toMatchObject({ code: 'consent-required' })
})
