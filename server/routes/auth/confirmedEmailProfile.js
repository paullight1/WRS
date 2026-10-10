import { serviceRest } from '../../../api/_lib/supabase.js'

export async function syncConfirmedEmailProfile(user) {
  const userId = String(user?.id || '')
  const email = String(user?.email || '').trim().toLowerCase()
  const confirmedAtValue = user?.email_confirmed_at
  if (!userId || !email || !confirmedAtValue) return false

  const confirmedAt = new Date(confirmedAtValue)
  if (Number.isNaN(confirmedAt.getTime())) return false

  const { data } = await serviceRest(
    `/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,normalized_email,status,email_verified_at&limit=1`,
  )
  const profile = Array.isArray(data) ? data[0] || null : null
  if (
    !profile ||
    profile.status !== 'pending' ||
    String(profile.normalized_email || '').trim().toLowerCase() !== email
  ) {
    return false
  }

  await serviceRest(
    `/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&normalized_email=eq.${encodeURIComponent(email)}&status=eq.pending`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        email_verified_at: profile.email_verified_at || confirmedAt.toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      },
    },
  )
  return true
}
