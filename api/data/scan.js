import { functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { serviceRpc } from '../../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  const expected = String(process.env.WRS_DATA_SCANNER_SECRET || '')
  if (!expected) throw new HttpError(503, 'Data scanner integration is not configured.', 'scanner-unavailable')
  if (request.headers.get('authorization') !== `Bearer ${expected}`)
    throw new HttpError(401, 'Unauthorized scan result.', 'unauthorized')
  const body = await readJson(request, 16_000)
  const assetId = String(body.assetId || '').trim()
  const scanStatus = String(body.scanStatus || '')
    .trim()
    .toLowerCase()
  if (!assetId || !['clean', 'infected', 'failed'].includes(scanStatus))
    throw new HttpError(400, 'Invalid scan result.', 'invalid-scan')
  await serviceRpc('wrs_update_asset_scan', { p_asset_id: assetId, p_scan_status: scanStatus })
  return json({ assetId, scanStatus })
})
