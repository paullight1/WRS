import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { createPayoutMethod } from '../../server/finance.js'
import { createTransferRecipient } from '../../server/paystack.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true, kyc: true })
  const body = await readJson(request, 24_000)
  const accountNumber = String(body.accountNumber || '').replace(/\s+/g, '')
  const bankCode = String(body.bankCode || '').trim()
  const accountName = String(body.accountName || '').trim()
  const currency = String(body.currency || 'NGN').toUpperCase()

  if (!/^\d{6,20}$/.test(accountNumber)) throw new HttpError(400, 'Invalid payout account number.', 'invalid-account')
  if (!/^[A-Za-z0-9_-]{2,20}$/.test(bankCode)) throw new HttpError(400, 'Invalid bank code.', 'invalid-bank')
  if (accountName.length < 2 || accountName.length > 120)
    throw new HttpError(400, 'Invalid account name.', 'invalid-account-name')
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, 'Invalid payout currency.', 'invalid-currency')

  const recipient = await createTransferRecipient({ name: accountName, accountNumber, bankCode, currency })
  const method = await createPayoutMethod(
    resolved.user.id,
    { accountNumber, bankCode, accountName, currency },
    recipient.recipientCode,
  )

  return appendCookies(
    json(
      {
        payoutMethod: {
          id: method.id,
          maskedAccount: method.masked_account,
          bankCode: method.bank_code,
          accountName: method.account_name,
          currency: method.currency,
          status: method.status,
        },
      },
      201,
    ),
    resolved.cookies,
  )
})
