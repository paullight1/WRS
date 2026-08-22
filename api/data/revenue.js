import { appendCookies, functionHandler, json, requireMethod } from '../../server/http.js'
import { dataRevenue } from '../../server/data.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const allocations = await dataRevenue(resolved.user.id)
  return appendCookies(
    json({
      allocations: allocations.map((item) => ({
        id: item.id,
        amountMinor: Number(item.amount_minor),
        currency: item.currency,
        status: item.status,
        createdAt: item.created_at,
        distributedAt: item.distributed_at,
        licenseReference: item.dataset_licenses?.external_reference || null,
        customerReference: item.dataset_licenses?.customer_reference || null,
      })),
    }),
    resolved.cookies,
  )
})
