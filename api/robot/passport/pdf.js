import { signedToken, verifySignedToken } from '../../_lib/crypto.js'
import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, requireMethod } from '../../_lib/http.js'
import { createPassportPdf } from '../../_lib/pdf.js'
import { requireSession } from '../../_lib/session.js'
import { serviceRpc } from '../../_lib/supabase.js'

function signingSecret() {
  const secret = process.env.WRS_PASSPORT_SIGNING_SECRET || process.env.WRS_SERVER_SIGNING_SECRET
  if (!secret) throw new HttpError(503, 'Passport signing is not configured.', 'passport-export-unavailable')
  return secret
}

async function ownerPassport(userId, robotId) {
  const { data } = await serviceRpc('wrs_get_robot_passport', {
    p_user_id: userId,
    p_robot_id: robotId,
  })
  if (!data) throw new HttpError(404, 'Robot passport was not found.', 'passport-not-found')
  return data
}

function filenameFor(passport) {
  const safe = String(passport.name || 'robot')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `WRS-${safe || 'robot'}-passport.pdf`
}

export default functionHandler(async (request) => {
  requireMethod(request, ['GET', 'POST'])
  const resolved = await requireSession(request, { verified: true })
  const url = new URL(request.url)
  const robotId = String(url.searchParams.get('robotId') || '')
  if (!robotId) throw new HttpError(400, 'Robot ID is required.', 'invalid-robot')

  if (request.method === 'POST') {
    assertSameOrigin(request)
    const passport = await ownerPassport(resolved.user.id, robotId)
    const expiresAt = Date.now() + 5 * 60_000
    const token = signedToken({ v: 1, robotId, userId: resolved.user.id, exp: expiresAt }, signingSecret())
    const descriptorUrl = `${url.origin}${url.pathname}?robotId=${encodeURIComponent(robotId)}&token=${encodeURIComponent(token)}`
    return appendCookies(
      json({
        url: descriptorUrl,
        filename: filenameFor(passport),
        expiresAt: new Date(expiresAt).toISOString(),
      }),
      resolved.cookies,
    )
  }

  const payload = verifySignedToken(url.searchParams.get('token'), signingSecret())
  if (
    payload?.v !== 1 ||
    payload.robotId !== robotId ||
    payload.userId !== resolved.user.id ||
    Number(payload.exp || 0) <= Date.now()
  ) {
    throw new HttpError(403, 'Passport export link is invalid or expired.', 'passport-export-invalid')
  }
  const passport = await ownerPassport(resolved.user.id, robotId)
  const verificationUrl = `${url.origin}/api/robot/passport/verify?verificationId=${encodeURIComponent(passport.publicVerificationId)}`
  const pdf = createPassportPdf(passport, verificationUrl)
  const response = new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filenameFor(passport)}"`,
      'cache-control': 'private, no-store',
      'content-length': String(pdf.length),
    },
  })
  return appendCookies(response, resolved.cookies)
})
