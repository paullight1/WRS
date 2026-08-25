import { verifyAcademyCertificate } from '../../server/ecosystem.js'
import { functionHandler, HttpError, json, requireMethod } from '../../server/http.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const verificationId = String(new URL(request.url).searchParams.get('id') || '').trim()
  if (!verificationId) throw new HttpError(400, 'Certificate verification ID is required.', 'verification-required')
  const certificate = await verifyAcademyCertificate(verificationId)
  if (!certificate) throw new HttpError(404, 'Certificate not found.', 'certificate-not-found')
  return json({ certificate })
})
