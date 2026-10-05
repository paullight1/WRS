import { pathToFileURL } from 'node:url'

// Explicit project-owner tool: no browser/session inference and no environment auto-loading.
export async function bootstrapInitialAdmin(env = process.env, fetcher = fetch) {
  const url = String(env.SUPABASE_URL || '').trim()
  const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const expectedProjectRef = String(env.WRS_EXPECTED_PROJECT_REF || '').trim()
  const subjectUserId = String(env.WRS_INITIAL_ADMIN_USER_ID || '').trim()
  if (!url || !serviceRoleKey || !expectedProjectRef || !subjectUserId) {
    throw new Error(
      'Explicit Supabase URL, service-role key, expected project ref and initial-admin UUID are required.',
    )
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subjectUserId)) {
    throw new Error('Initial-admin target must be an existing account UUID.')
  }
  let projectUrl
  try {
    projectUrl = new URL(url)
  } catch {
    throw new Error('Invalid Supabase project URL.')
  }
  if (
    !/^[a-z0-9]+$/.test(expectedProjectRef) ||
    projectUrl.protocol !== 'https:' ||
    projectUrl.hostname !== `${expectedProjectRef}.supabase.co` ||
    projectUrl.port ||
    projectUrl.username ||
    projectUrl.password ||
    projectUrl.search ||
    projectUrl.hash ||
    projectUrl.pathname !== '/'
  ) {
    throw new Error('Supabase URL does not match the explicitly expected project ref.')
  }
  const reason = String(env.WRS_INITIAL_ADMIN_REASON || 'Trusted project-owner initial administrator bootstrap').trim()
  if (reason.length < 3 || reason.length > 1000) throw new Error('Bootstrap reason must contain 3 to 1000 characters.')
  let response
  try {
    response = await fetcher(`${projectUrl.origin}/rest/v1/rpc/wrs_bootstrap_initial_admin`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_subject_user_id: subjectUserId, p_reason: reason }),
    })
  } catch {
    throw new Error('Bootstrap request failed; inspect the trusted project logs before retrying.')
  }
  if (!response.ok)
    throw new Error(
      'Bootstrap refused by the database; verify the account is active and no administrator already exists.',
    )
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('Bootstrap result could not be read; inspect the trusted project audit before retrying.')
  }
  if (
    String(result?.userId).toLowerCase() !== subjectUserId.toLowerCase() ||
    result?.role !== 'admin' ||
    !result?.auditId
  ) {
    throw new Error('Bootstrap result could not be verified; inspect the trusted project audit before retrying.')
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await bootstrapInitialAdmin()
    console.log('Initial administrator established and audited.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Bootstrap failed.')
    process.exitCode = 1
  }
}
