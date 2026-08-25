import { functionHandler, HttpError, json, readJson, requireMethod } from '../../../server/http.js'
import { distributeDatasetLicense } from '../../../server/data.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  const expected = String(process.env.WRS_DATA_LICENSE_SECRET || '')
  if (!expected) throw new HttpError(503, 'Dataset licensing integration is not configured.', 'licensing-unavailable')
  if (request.headers.get('authorization') !== `Bearer ${expected}`)
    throw new HttpError(401, 'Unauthorized distribution request.', 'unauthorized')
  const body = await readJson(request, 16_000)
  const licenseId = String(body.licenseId || '').trim()
  if (!licenseId) throw new HttpError(400, 'License ID is required.', 'license-required')
  // wrs_distribute_dataset_license validates paid license state, approved/clean items,
  // active research-licensing consent and posts contributor allocations through Plan 5 ledger journals.
  const result = await distributeDatasetLicense(licenseId)
  return json(result)
})
