import { processNextAccountDeletion } from '../../_lib/account.js'
import { functionHandler, json, requireMethod } from '../../_lib/http.js'
import { requireInternalBearer } from '../../_lib/internalAuth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  requireInternalBearer(request, 'WRS_ACCOUNT_DELETION_WORKER_TOKEN')
  const result = await processNextAccountDeletion()
  return json({ processed: result })
})
