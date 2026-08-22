import { functionHandler, HttpError, json, requireMethod } from '../../_lib/http.js'
import { serviceRpc } from '../../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const verificationId = String(new URL(request.url).searchParams.get('verificationId') || '')
  if (!verificationId) throw new HttpError(400, 'Verification ID is required.', 'invalid-verification-id')
  const { data: passport } = await serviceRpc('wrs_verify_robot_passport', {
    p_public_verification_id: verificationId,
  })
  if (!passport) throw new HttpError(404, 'Robot passport verification was not found.', 'passport-not-found')
  return json({ passport })
})
