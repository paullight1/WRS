import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { attachPaymentProvider, createPaymentIntent } from '../../server/finance.js'
import { initializeTransaction } from '../../server/paystack.js'
import { requireSession } from '../../server/session.js'

const packageSlugs = new Set(['starter', 'builder', 'professional', 'enterprise', 'elite', 'visionary'])

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 32_000)
  const packageSlug = String(body.packageSlug || '').trim().toLowerCase()
  if (!packageSlugs.has(packageSlug)) throw new HttpError(400, 'Unknown package.', 'invalid-package')

  const idempotencyKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim()
  if (idempotencyKey.length < 16 || idempotencyKey.length > 160) {
    throw new HttpError(400, 'A stable idempotency key is required.', 'idempotency-required')
  }

  const currency = String(body.currency || 'USD').toUpperCase()
  const intent = await createPaymentIntent(resolved.user.id, packageSlug, currency, idempotencyKey)
  const origin = new URL(request.url).origin
  const initialized = await initializeTransaction({
    intentId: intent.intentId,
    reference: intent.reference,
    amountMinor: Number(intent.amountMinor),
    currency: intent.currency,
    email: intent.email,
    callbackUrl: `${origin}/packages/${encodeURIComponent(packageSlug)}/success`,
    metadata: { intentId: intent.intentId, packageSlug },
  })
  await attachPaymentProvider(resolved.user.id, intent.intentId, initialized.reference, initialized.accessCode)

  return appendCookies(
    json({
      intentId: intent.intentId,
      reference: initialized.reference,
      authorizationUrl: initialized.authorizationUrl,
      amountMinor: Number(intent.amountMinor),
      currency: intent.currency,
    }),
    resolved.cookies,
  )
})
