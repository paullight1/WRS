import { createPendingAccount, enforceRateLimit, validateRegistration } from '../_lib/auth.js'
import { assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../_lib/http.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const input = await readJson(request)
  const registration = validateRegistration(input)
  await enforceRateLimit(request, 'register', `${registration.email}:${registration.phone}`, 4, 15 * 60)
  return json(await createPendingAccount(registration), 201)
})
