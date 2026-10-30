import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const operatorSession = {
  userId: '22222222-2222-4222-8222-222222222222',
  email: 'operator@wrs.test',
  status: 'active',
  emailVerified: true,
  phoneVerified: true,
  roles: ['admin'],
  expiresAt: '2099-01-01T00:00:00.000Z',
  accountDeletionPending: false,
  mfaEnabled: true,
  mfaSatisfiedAt: new Date().toISOString(),
}
const fixtures = {
  users: {
    users: [
      {
        user_id: 'member-01',
        full_name: 'Ada Okafor',
        normalized_email: 'ada.okafor@wrs.test',
        status: 'active',
        kyc_status: 'pending',
        country_code: 'NG',
        created_at: '2026-10-20T10:00:00Z',
      },
      {
        user_id: 'member-02',
        full_name: 'Kwame Mensah',
        normalized_email: 'kwame.mensah@wrs.test',
        status: 'suspended',
        kyc_status: 'verified',
        country_code: 'GH',
      },
    ],
    userStats: { total: 2, active: 1, pending: 0, verificationPending: 1, verified: 1, suspended: 1 },
  },
  support: {
    support: [
      {
        id: 'ticket-01',
        user_id: 'member-01',
        subject: 'Robot training help',
        category: 'training',
        status: 'open',
        priority: 'normal',
        updated_at: '2026-10-29T10:00:00Z',
      },
    ],
  },
  finance: {
    payments: [
      {
        id: 'payment-01',
        user_id: 'member-01',
        amount_minor: 250000,
        currency: 'NGN',
        status: 'paid',
        updated_at: '2026-10-29T10:00:00Z',
      },
    ],
    withdrawals: [],
    settlements: [{ id: 'deployment-01', status: 'completed', completed_at: '2026-10-29T10:00:00Z' }],
  },
  deployments: {
    deploymentRequests: [{ id: 'request-01', status: 'requested', requested_at: '2026-10-28T10:00:00Z' }],
    deployments: [{ id: 'deployment-02', robot_id: 'robot-01', user_id: 'member-01', status: 'active' }],
  },
  data: {
    submissions: [{ id: 'submission-01', status: 'review', quality_score: null, submitted_at: '2026-10-29T10:00:00Z' }],
    taskResponses: [
      {
        id: 'response-01',
        task_slug: 'robot-navigation',
        data_category: 'training',
        status: 'submitted',
        response: { answer: 'The robot should stop at the crossing.' },
        submitted_at: '2026-10-29T10:00:00Z',
      },
    ],
    deletions: [],
  },
  risk: {
    referrals: [{ id: 'referral-01', referred_user_id: 'member-02', status: 'pending' }],
    moderation: [
      {
        id: 'moderation-01',
        target_type: 'community_profile',
        target_id: 'member-01',
        action: 'review',
        reason: 'Reported community profile',
      },
    ],
  },
  rewards: {
    issuance: {
      enabled: false,
      atomicScale: 6,
      totalIssuedAtomic: '125000000000',
      globalIssuanceCapAtomic: '200000000000000',
    },
    rules: [{ id: 'rule-01', version: 1, status: 'active', issuanceEnabled: false }],
  },
}
const namedUser = { user_name: 'Ada Okafor', user_email: 'ada.okafor@wrs.test' }
Object.assign(fixtures.support.support[0], namedUser, {
  messages: [
    {
      id: 'message-01',
      actor_name: 'Ada Okafor',
      author_role: 'user',
      body: 'How can I finish my training?',
      created_at: '2026-10-29T09:00:00Z',
    },
    {
      id: 'message-02',
      actor_name: 'Kwame Support',
      author_role: 'operator',
      body: 'Open your next training task from the Training page.',
      created_at: '2026-10-29T10:00:00Z',
    },
  ],
})
Object.assign(fixtures.finance.payments[0], namedUser, { package_slug: 'professional', status: 'succeeded' })
fixtures.finance.withdrawals = [
  { ...namedUser, id: 'withdrawal-01', user_id: 'member-01', amount_minor: 50000, currency: 'NGN', status: 'reserved' },
]
Object.assign(fixtures.finance.settlements[0], namedUser, {
  job_title: 'Warehouse inspection',
  robot_name: 'Atlas',
  payout_status: 'ready',
})
Object.assign(fixtures.deployments.deploymentRequests[0], namedUser, {
  job_title: 'Inventory check',
  robot_name: 'Atlas',
})
Object.assign(fixtures.deployments.deployments[0], namedUser, {
  job_title: 'Warehouse inspection',
  robot_name: 'Atlas',
})
Object.assign(fixtures.data.submissions[0], namedUser, {
  asset_id: '44444444-4444-4444-8444-444444444444',
  data_category: 'voice',
  scan_status: 'clean',
  mime_type: 'audio/wav',
  size_bytes: 102400,
})
Object.assign(fixtures.data.taskResponses[0], namedUser)
fixtures.data.deletions = [
  {
    ...namedUser,
    id: 'deletion-01',
    data_category: 'voice',
    status: 'requested',
    reason: 'Remove my recording',
    requested_at: '2026-10-29T09:00:00Z',
  },
]
Object.assign(fixtures.risk.referrals[0], {
  referred_name: 'Ada Okafor',
  referred_email: 'ada.okafor@wrs.test',
  referrer_name: 'Kwame Mensah',
  referrer_email: 'kwame@wrs.test',
  referral_code: 'WRS123',
  eligibility_status: 'ready',
  eligibility_reason: 'Ready for approval.',
})
Object.assign(fixtures.risk.moderation[0], {
  target_name: 'Ada community profile',
  target_content: { display_name: 'Ada Okafor', opted_in: true },
  reviewer_name: 'Kwame Support',
})
for (const [scope, groups] of Object.entries({
  support: ['support'],
  finance: ['payments', 'withdrawals', 'settlements'],
  deployments: ['deploymentRequests', 'deployments'],
  data: ['submissions', 'taskResponses', 'deletions'],
  risk: ['referrals', 'moderation'],
})) {
  fixtures[scope].stats = Object.fromEntries(
    groups.map((group) => [
      group,
      {
        total: fixtures[scope][group].length,
        open: 1,
        waiting: 0,
        resolved: 0,
        paid: 0,
        pending: 1,
        failed: 0,
        inProgress: 1,
        ready: 1,
        requested: 1,
        matched: 0,
        cancelled: 0,
        active: 1,
        completed: 0,
        approved: 0,
        rejected: 0,
        qualified: 0,
        profiles: 1,
        events: 0,
        announcements: 0,
      },
    ]),
  )
}
fixtures.finance.stats.payments.paid = 1
fixtures.finance.stats.payments.pending = 0
fixtures.overview = {
  summary: {
    generatedAt: '2026-10-30T12:00:00Z',
    totals: [
      ['users_total', 'users', 68],
      ['users_active', 'users', 64],
      ['users_pending', 'users', 3],
      ['users_suspended', 'users', 1],
      ['payments_total', 'finance', 72],
      ['payments_paid', 'finance', 60],
      ['withdrawals_total', 'finance', 10],
      ['withdrawals_paid', 'finance', 7],
      ['payouts_paid', 'finance', 4],
      ['robots_total', 'deployments', 12],
      ['robots_active', 'deployments', 10],
      ['requests_total', 'deployments', 21],
      ['jobs_total', 'deployments', 9],
      ['jobs_active', 'deployments', 4],
      ['jobs_completed', 'deployments', 4],
      ['submissions_total', 'data', 85],
      ['submissions_approved', 'data', 61],
      ['training_total', 'data', 43],
      ['training_approved', 'data', 40],
      ['deletions_total', 'data', 2],
      ['support_total', 'support', 50],
      ['support_finished', 'support', 38],
      ['referrals_total', 'risk', 15],
      ['referrals_approved', 'risk', 9],
      ['community_reviews_total', 'risk', 4],
    ].map(([key, scope, value]) => ({ key, scope, value, status: 'ready' })),
    recentUsers: [
      {
        user_id: 'member-01',
        full_name: 'Ada Okafor',
        normalized_email: 'ada@wrs.test',
        status: 'active',
        created_at: '2026-10-30T12:00:00Z',
      },
    ],
    issuance: { ...fixtures.rewards.issuance, status: 'ready' },
    metrics: [
      ['kyc_pending', 'users', 8],
      ['support_open', 'support', 12],
      ['withdrawals_in_progress', 'finance', 3],
      ['deployment_requests', 'deployments', 5],
      ['data_submissions_review', 'data', 24],
      ['data_deletions_due', 'data', 0],
      ['referrals_pending', 'risk', 6],
      ['reward_policy', 'rewards', 'active_disabled'],
    ].map(([key, scope, value]) => ({ key, scope, value, status: 'ready' })),
  },
}

async function prepare(page, roles = ['admin'], sessionOverrides = {}) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('admin-test-started')) {
      localStorage.clear()
      sessionStorage.setItem('admin-test-started', '1')
    }
  })
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: { session: { ...operatorSession, roles, ...sessionOverrides } } }),
  )
  await page.route('**/api/admin/operations*', (route) => {
    const scope = new URL(route.request().url()).searchParams.get('scope') || 'overview'
    return route.fulfill({ json: { scope, ...fixtures[scope] } })
  })
  await page.route('**/api/admin/action', (route) => route.fulfill({ json: { changed: true } }))
  await page.route('**/api/admin/team', (route) =>
    route.fulfill({
      json: {
        members: [
          {
            userId: '33333333-3333-4333-8333-333333333333',
            fullName: 'Kwame Support',
            email: 'member@wrs.test',
            roles: ['support_operator'],
          },
        ],
        stats: { total: 1, active: 1, pending: 0, suspended: 0, scope: 'all' },
        hasMore: false,
      },
    }),
  )
  await page.route('**/api/admin/role-subject*', (route) =>
    route.fulfill({
      json: {
        userId: '33333333-3333-4333-8333-333333333333',
        identifier: 'member@wrs.test',
        roles: ['support_operator'],
      },
    }),
  )
}

test('dark workspace defaults correctly and stores a separate theme preference', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=users')
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible()
  await expect(page.locator('[data-admin-theme]')).toHaveAttribute('data-admin-theme', 'dark')
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await page.reload()
  await expect(page.locator('[data-admin-theme]')).toHaveAttribute('data-admin-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('wrs-theme'))).toBeNull()
})

test('KYC operators see contextual permitted actions', async ({ page }) => {
  await prepare(page, ['kyc_operator'])
  await page.goto('/?scope=users')
  await page
    .getByRole('button', { name: /^Details for / })
    .first()
    .click()
  await expect(page.getByRole('dialog', { name: 'Selected record' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save identity check', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Action', exact: true })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Suspend account' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Payments', exact: true })).toHaveCount(0)
})

test('mobile drawer navigates without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page, ['support_operator'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Open admin navigation' }).click()
  await page.getByRole('link', { name: 'Support', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Support', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    outside: [...document.querySelectorAll('body *')]
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .map((element) => ({
        tag: element.tagName,
        className: String(element.className),
        width: element.getBoundingClientRect().width,
        right: element.getBoundingClientRect().right,
      }))
      .slice(0, 20),
  }))
  await page.screenshot({ path: 'output/playwright/admin-mobile-records.png', fullPage: true })
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width)
  await page.getByRole('button', { name: /^Details for / }).click()
  await expect(page.getByLabel('Reason for change')).toBeVisible()
  await page.screenshot({ path: 'output/playwright/admin-mobile-details.png', fullPage: true })
})

test('users redesign shows named stats and fits at narrow desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 626, height: 900 })
  await prepare(page)
  await page.goto('/?scope=users')
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible()
  const stats = page.locator('[aria-label="User statistics"]')
  for (const label of ['Total users', 'Active accounts', 'Suspended'])
    await expect(stats.getByText(label, { exact: true })).toBeVisible()
  await expect(stats.getByText('Pending accounts', { exact: true })).toBeVisible()
  await expect(stats).toContainText('2')
  await expect(page.locator('.admin-global-header .admin-avatar')).toBeVisible()
  await page.getByRole('button', { name: 'Open admin navigation' }).click()
  await expect(page.locator('.admin-native-drawer .admin-brand-logo')).toBeVisible()
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  await page.screenshot({ path: 'output/playwright/admin-navigation-redesign.png' })
  await page
    .getByRole('dialog', { name: 'Admin navigation' })
    .getByRole('button', { name: 'Close admin navigation' })
    .click()
  await expect(page.getByText('Ada Okafor', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'output/playwright/admin-users-redesign.png' })
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width)
})

test('finance separates read-only payments from settlement controls', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=finance')
  await expect(page.getByText(/2,500\.00/)).toBeVisible()
  await page.getByRole('button', { name: /^Details for / }).click()
  await expect(page.getByText('This record is view-only')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Job payouts', exact: true }).click()
  await page.getByRole('button', { name: /^Details for / }).click()
  await page.getByLabel('Reason for change').fill('Verified completed work')
  await expect(page.getByRole('button', { name: 'Pay for job', exact: true })).toBeEnabled()
})

test('support changes use the selected ticket and retain success feedback', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=support')
  await page.getByRole('button', { name: /^Details for / }).click()
  await page.getByLabel('Ticket status').selectOption('resolved')
  await page.getByLabel('Reason for change').fill('Resolved member question')
  const request = page.waitForRequest('**/api/admin/action')
  await page.getByRole('button', { name: 'Save ticket' }).click()
  expect((await request).postDataJSON()).toMatchObject({
    action: 'support.update',
    ticketId: 'ticket-01',
    status: 'resolved',
    reason: 'Resolved member question',
  })
  await expect(page.getByRole('status').filter({ hasText: 'Ticket updated.' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('training review displays the response and validates approval score', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=data')
  await page.getByRole('link', { name: 'Training reviews', exact: true }).click()
  await page.getByRole('button', { name: /^Details for / }).click()
  await expect(page.getByText(/The robot should stop at the crossing/)).toBeVisible()
  await page.getByLabel('Reason for change').fill('Reviewed training response')
  await page.getByLabel('Quality score', { exact: true }).fill('79')
  await expect(page.getByRole('button', { name: 'Save review' })).toBeDisabled()
  await page.getByLabel('Quality score', { exact: true }).fill('95')
  await page.getByRole('button', { name: 'Save review' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Review saved' })).toBeVisible()
})

async function openAdminPage(page, { scope, label, heading, section, pageKey }) {
  const navigation = page.locator('.admin-sidebar-nav')
  if (section) {
    const group = navigation.locator('details').filter({ hasText: section }).first()
    if ((await group.getAttribute('open')) === null) await group.locator('summary').click()
  }
  await navigation.getByRole('link', { name: label, exact: true }).click()
  await expect(page.locator('h1')).toHaveText(heading)
  const url = new URL(page.url())
  expect(url.searchParams.get('scope')).toBe(scope)
  if (pageKey) expect(url.searchParams.get('page')).toBe(pageKey)
}

test('all child pages load from the shared navigation', async ({ page }) => {
  test.setTimeout(120000)
  await prepare(page)
  await page.goto('/')
  for (const item of [
    { scope: 'users', label: 'Users', heading: 'Users' },
    { scope: 'users', label: 'Identity checks', heading: 'Identity checks', pageKey: 'identity' },
    { scope: 'support', label: 'Support', heading: 'Support' },
    { scope: 'finance', label: 'Payments', heading: 'Payments', section: 'Money', pageKey: 'payments' },
    { scope: 'finance', label: 'Withdrawals', heading: 'Withdrawals', section: 'Money', pageKey: 'withdrawals' },
    { scope: 'finance', label: 'Job payouts', heading: 'Job payouts', section: 'Money', pageKey: 'settlements' },
    {
      scope: 'deployments',
      label: 'Job requests',
      heading: 'Job requests',
      section: 'Jobs',
      pageKey: 'deploymentRequests',
    },
    { scope: 'deployments', label: 'Assigned jobs', heading: 'Assigned jobs', section: 'Jobs', pageKey: 'deployments' },
    { scope: 'data', label: 'Data submissions', heading: 'Data submissions', section: 'Data', pageKey: 'submissions' },
    {
      scope: 'data',
      label: 'Training reviews',
      heading: 'Training reviews',
      section: 'Data',
      pageKey: 'taskResponses',
    },
    {
      scope: 'data',
      label: 'Deletion requests',
      heading: 'Deletion requests',
      section: 'Data',
      pageKey: 'deletions',
    },
    { scope: 'risk', label: 'Referrals', heading: 'Referrals', section: 'Community', pageKey: 'referrals' },
    {
      scope: 'risk',
      label: 'Community reviews',
      heading: 'Community reviews',
      section: 'Community',
      pageKey: 'moderation',
    },
    { scope: 'rewards', label: 'Rewards', heading: 'Rewards' },
    { scope: 'access', label: 'Team access', heading: 'Team access' },
  ])
    await openAdminPage(page, item)
})

test('operator access looks up accounts without the duplicate checklist', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=access')
  await page.getByLabel('Exact account email or account ID').fill('member@wrs.test')
  await page.getByRole('button', { name: 'Find account' }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: 'member@wrs.test' })).toBeVisible()
  await expect(page.getByText('Access change checklist')).toHaveCount(0)
})

test('rewards use focused sections', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=rewards')
  await expect(page.getByRole('heading', { name: 'Saved reward settings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Activity rewards' })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Create a rule' }).click()
  await expect(page.getByRole('heading', { name: 'Activity rewards' })).toBeVisible()
  await page.getByRole('tab', { name: 'Check contribution' }).click()
  await expect(page.getByLabel('User ID', { exact: true })).toBeVisible()
})

test('search and status filters have a useful empty state', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=users')
  await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('suspended')
  await expect(page.getByText('Ada Okafor', { exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Search records' }).fill('missing')
  await expect(page.getByRole('heading', { name: 'No matches found' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByText('Ada Okafor', { exact: true })).toBeVisible()
})

test('overview desktop and mobile pass accessibility checks', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()
  await expect(page.getByLabel('User totals').getByText('68', { exact: true })).toBeVisible()
  await expect(page.getByText('Ada Okafor', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Payments.*72/ })).toBeVisible()
  await page.screenshot({ path: 'output/playwright/admin-overview-desktop.png', fullPage: true })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'output/playwright/admin-overview-mobile.png', fullPage: true })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('the member application uses the same admin workspace and keeps admin links on its route', async ({ page }) => {
  test.setTimeout(120000)
  await prepare(page)
  await page.route('**/api/robot', (route) => route.fulfill({ json: { robots: [] } }))
  await page.goto('http://127.0.0.1:5190/admin/operations?scope=users')
  await expect(page.locator('h1')).toHaveText('Users', { timeout: 60000 })
  await page.locator('.admin-sidebar-nav').getByRole('link', { name: 'Support', exact: true }).click()
  await expect(page).toHaveURL(/http:\/\/127\.0\.0\.1:5190\/admin\/operations\?scope=support(?:&page=support)?$/)
  await expect(page.getByText('Robot training help')).toBeVisible()
})

test('mobile admins can grant scoped access from the account panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page)
  await page.goto('/?scope=access')
  await page.getByLabel('Exact account email or account ID').fill('member@wrs.test')
  await page.getByRole('button', { name: 'Find account' }).click()
  await page.getByLabel('Reason for access change').fill('Approved finance coverage')
  const grant = page.getByRole('button', { name: 'Grant finance staff' })
  await expect(grant).toBeVisible()
  await expect(grant).toBeEnabled()
  const request = page.waitForRequest('**/api/admin/action')
  await grant.click()
  expect((await request).postDataJSON()).toMatchObject({
    action: 'role.grant',
    role: 'finance_operator',
    userId: '33333333-3333-4333-8333-333333333333',
  })
  await expect(page.getByRole('status').filter({ hasText: 'Access change saved' })).toContainText('Access change saved')
})

const recordActions = [
  {
    title: 'identity check updates',
    scope: 'users',
    action: 'kyc.set',
    submit: 'Save identity check',
    expected: { userId: 'member-01', kycStatus: 'verified' },
    fill: async (page) =>
      page.getByRole('combobox', { name: 'Identity check status', exact: true }).selectOption('verified'),
  },
  {
    title: 'account suspension',
    scope: 'users',
    action: 'user.suspend',
    submit: 'Suspend account',
    expected: { userId: 'member-01' },
  },
  {
    title: 'account restoration',
    scope: 'users',
    action: 'user.restore',
    submit: 'Restore account',
    expected: { userId: 'member-02' },
    status: 'suspended',
  },
  {
    title: 'job assignment',
    scope: 'deployments',
    action: 'deployment.match',
    submit: 'Assign job',
    expected: { requestId: 'request-01' },
  },
  {
    title: 'job payout',
    scope: 'finance',
    page: 'Job payouts',
    action: 'deployment.settle',
    submit: 'Pay for job',
    expected: { deploymentId: 'deployment-01' },
  },
  {
    title: 'data submission review',
    scope: 'data',
    action: 'data.review',
    submit: 'Save review',
    expected: {
      submissionId: 'submission-01',
      completeness: 90,
      accuracy: 90,
      consistency: 90,
      signalQuality: 90,
      reviewerAgreement: 90,
      policyCompliance: 90,
    },
    fill: async (page) => {
      for (const label of [
        'Complete information',
        'Correct information',
        'Consistent information',
        'Clear data',
        'Reviewers agree',
        'Follows the rules',
      ])
        await page.getByLabel(label, { exact: true }).fill('90')
    },
  },
  {
    title: 'referral check',
    scope: 'risk',
    action: 'referral.qualify',
    submit: 'Approve referral',
    expected: { relationshipId: 'referral-01' },
  },
  {
    title: 'community moderation',
    scope: 'risk',
    page: 'Community reviews',
    action: 'community.moderate',
    submit: 'Save review note',
    expected: { targetType: 'community_profile', targetId: 'member-01', moderationAction: 'hide' },
    fill: async (page) => page.getByLabel('Review outcome', { exact: true }).fill('hide'),
  },
]
for (const item of recordActions) {
  test(`saves ${item.title} against the selected record`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await prepare(page)
    await page.goto(`/?scope=${item.scope}`)
    if (item.page) await page.getByRole('link', { name: item.page, exact: true }).click()
    if (item.status) await page.getByRole('combobox', { name: 'Filter by status' }).selectOption(item.status)
    await page
      .getByRole('button', { name: /^Details for / })
      .first()
      .click()
    const actionSelect = page.getByRole('combobox', { name: 'Action', exact: true })
    if (await actionSelect.count()) await actionSelect.selectOption(item.action)
    if (item.fill) await item.fill(page)
    await page.getByLabel('Reason for change').fill('Reviewed and approved this record')
    const request = page.waitForRequest('**/api/admin/action')
    await page.getByRole('button', { name: item.submit, exact: true }).click()
    expect((await request).postDataJSON()).toMatchObject({
      action: item.action,
      reason: 'Reviewed and approved this record',
      ...item.expected,
    })
    await expect(page.locator('.admin-notice')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Selected record' })).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('an expired MFA proof can be renewed without submitting the record action', async ({ page }) => {
  await prepare(page, ['admin'], { mfaSatisfiedAt: new Date(Date.now() - 11 * 60_000).toISOString() })
  const actions = []
  await page.route('**/api/admin/action', (route) => {
    actions.push(route.request().postDataJSON())
    return route.fulfill({ json: { changed: true } })
  })
  await page.route('**/api/auth/mfa/step-up', (route) =>
    route.fulfill({ json: { session: { ...operatorSession, mfaSatisfiedAt: new Date().toISOString() } } }),
  )
  await page.goto('/?scope=users')
  await page
    .getByRole('button', { name: /^Details for / })
    .first()
    .click()
  await page.getByLabel('Reason for change').fill('Verified identity documents')
  const save = page.getByRole('button', { name: 'Save identity check' })
  await expect(save).toBeDisabled()
  expect(await page.locator('form form').count()).toBe(0)
  await page.getByLabel('Security code').fill('123456')
  await page.getByRole('button', { name: 'Check code', exact: true }).click()
  await expect(save).toBeEnabled()
  expect(actions).toEqual([])
  await save.click()
  await expect(page.locator('.admin-notice')).toContainText('Identity check updated')
  expect(actions).toHaveLength(1)
})

test('reward drafts, activation, RBC controls and contribution verification all submit working actions', async ({
  page,
}) => {
  await prepare(page)
  const savedRules = []
  let issuance = { ...fixtures.rewards.issuance }
  const actions = []
  await page.route('**/api/admin/operations*', (route) =>
    new URL(route.request().url()).searchParams.get('scope') === 'rewards'
      ? route.fulfill({ json: { scope: 'rewards', rules: savedRules, issuance } })
      : route.fallback(),
  )
  await page.route('**/api/admin/action', (route) => {
    const body = route.request().postDataJSON()
    actions.push(body)
    if (body.action === 'rewards.rule.save') {
      savedRules.unshift({ ...body.rule, id: 'created-rule', version: 2, status: 'draft', issuanceEnabled: false })
      issuance = { ...issuance, globalIssuanceCapAtomic: body.rule.globalIssuanceCapAtomic }
    } else if (body.action === 'rewards.rule.activate') savedRules[0].status = 'active'
    else if (body.action === 'rewards.rule.disable') savedRules[0].status = 'disabled'
    else if (body.action.startsWith('rewards.issuance.')) {
      savedRules[0].issuanceEnabled = body.action.endsWith('.enable')
      issuance.enabled = savedRules[0].issuanceEnabled
    }
    return route.fulfill({ json: body.action === 'rewards.rule.save' ? { ruleId: 'created-rule' } : { changed: true } })
  })
  await page.goto('/?scope=rewards')
  await page.getByRole('tab', { name: 'Create a rule' }).click()
  for (const [label, value] of [
    ['Base RBC per hour (1×)', '1'],
    ['Extra RBC per hour for each mining power point', '0'],
    ['Maximum RBC per mining cycle', '24'],
    ['Maximum RBC per user per day', '24'],
    ['Total RBC distribution limit', '200000000'],
    ['RBC decimal places', '6'],
    ['Approved contributions required to start mining', '0'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByLabel('Reason for this change').fill('Approved reward policy')
  await page.getByRole('button', { name: 'Save draft rule' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible()
  expect(actions[0]).toMatchObject({
    action: 'rewards.rule.save',
    rule: {
      atomicScale: 6,
      baseRateAtomicPerHour: '1000000',
      perSessionCapAtomic: '24000000',
      globalIssuanceCapAtomic: '200000000000000',
    },
  })
  await page.getByRole('tab', { name: 'Saved rules' }).click()
  await expect(page.getByRole('combobox', { name: 'Saved rule', exact: true })).toHaveValue('created-rule')
  await expect(page.getByRole('button', { name: 'Enable RBC', exact: true })).toBeDisabled()
  for (const [button, action, state] of [
    ['Activate XP rule', 'rewards.rule.activate', 'active'],
    ['Enable RBC', 'rewards.issuance.enable', 'Enabled'],
    ['Pause RBC', 'rewards.issuance.disable', 'Paused'],
    ['Disable rule', 'rewards.rule.disable', 'disabled'],
  ]) {
    const request = page.waitForRequest('**/api/admin/action')
    await page.getByRole('button', { name: button, exact: true }).click()
    expect((await request).postDataJSON()).toMatchObject({
      action,
      ruleId: 'created-rule',
      reason: 'Approved reward policy',
    })
    await expect(page.locator('.admin-saved-rule').getByText(state, { exact: true })).toBeVisible()
  }
  await page.getByRole('tab', { name: 'Check contribution' }).click()
  await page.getByRole('combobox', { name: 'Activity', exact: true }).selectOption('mission')
  await page.getByLabel('User ID', { exact: true }).fill('33333333-3333-4333-8333-333333333333')
  await page.getByLabel('Activity reference', { exact: true }).fill('mission-reviewed-1')
  await page.getByLabel('Evidence and review reason').fill('Reviewed mission completion evidence')
  await page.getByLabel('Reason for this check').fill('Confirmed completed mission')
  const verification = page.waitForRequest('**/api/admin/action')
  await page.getByRole('button', { name: 'Check and award saved rewards' }).click()
  expect((await verification).postDataJSON()).toMatchObject({
    action: 'rewards.activity.verify',
    source: 'mission',
    referenceId: 'mission-reviewed-1',
    evidence: 'Reviewed mission completion evidence',
  })
})

test('operator grants and revocations refresh current permissions', async ({ page }) => {
  await prepare(page)
  const roles = new Set(['support_operator'])
  await page.route('**/api/admin/role-subject*', (route) =>
    route.fulfill({
      json: { userId: '33333333-3333-4333-8333-333333333333', identifier: 'member@wrs.test', roles: [...roles] },
    }),
  )
  await page.route('**/api/admin/action', (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'role.grant') roles.add(body.role)
    else roles.delete(body.role)
    return route.fulfill({ json: { changed: true } })
  })
  await page.goto('/?scope=access')
  await page.getByLabel('Exact account email or account ID').fill('member@wrs.test')
  await page.getByRole('button', { name: 'Find account' }).click()
  await page.getByLabel('Reason for access change').fill('Approved finance coverage')
  await page.getByRole('button', { name: 'Grant finance staff' }).click()
  await expect(page.getByRole('button', { name: 'Revoke finance staff' })).toBeEnabled()
  await page.getByRole('button', { name: 'Revoke finance staff' }).click()
  await expect(page.getByRole('button', { name: 'Grant finance staff' })).toBeEnabled()
})

test('every scoped role sees only its assigned work area', async ({ page }) => {
  const roleAccess = {
    support_operator: { heading: 'At a glance', label: 'Support', scopes: ['overview', 'support'], count: 2 },
    kyc_operator: { heading: 'Users', label: 'Users', scopes: ['overview', 'users'], count: 3 },
    finance_operator: {
      heading: 'At a glance',
      label: 'Payments',
      section: 'Money',
      scopes: ['overview', 'finance'],
      count: 4,
    },
    deployment_operator: {
      heading: 'At a glance',
      label: 'Job requests',
      section: 'Jobs',
      scopes: ['overview', 'deployments'],
      count: 3,
    },
    data_operator: {
      heading: 'At a glance',
      label: 'Data submissions',
      section: 'Data',
      scopes: ['overview', 'data'],
      count: 4,
    },
    risk_operator: {
      heading: 'At a glance',
      label: 'Referrals',
      section: 'Community',
      scopes: ['overview', 'risk'],
      count: 3,
    },
    reward_operator: { heading: 'At a glance', label: 'Rewards', scopes: ['overview', 'rewards'], count: 2 },
  }
  for (const [role, access] of Object.entries(roleAccess)) {
    await prepare(page, [role])
    await page.goto('/?scope=users')
    await expect(page.locator('h1')).toHaveText(access.heading)
    const navigation = page.locator('.admin-sidebar-nav')
    if (access.section) {
      const group = navigation.locator('details').filter({ hasText: access.section }).first()
      if ((await group.getAttribute('open')) === null) await group.locator('summary').click()
    }
    const links = navigation.getByRole('link')
    await expect(links).toHaveCount(access.count)
    await expect(navigation.getByRole('link', { name: access.label, exact: true })).toBeVisible()
    const scopes = await links.evaluateAll((nodes) =>
      nodes.map((node) => new URL(node.getAttribute('href'), window.location.origin).searchParams.get('scope')),
    )
    expect(scopes.every((scope) => access.scopes.includes(scope))).toBe(true)
    for (const scope of access.scopes) expect(scopes).toContain(scope)
    await expect(navigation.getByRole('link', { name: 'Team access', exact: true })).toHaveCount(0)
  }
})

test('read failures can be retried and action failures retain their target and input', async ({ page }) => {
  await prepare(page)
  let readFails = true
  let actionFails = true
  const actions = []
  await page.route('**/api/admin/operations*', (route) =>
    new URL(route.request().url()).searchParams.get('scope') === 'support'
      ? route.fulfill(
          readFails
            ? { status: 503, json: { message: 'Support service is temporarily unavailable' } }
            : { json: { scope: 'support', ...fixtures.support } },
        )
      : route.fallback(),
  )
  await page.route('**/api/admin/action', (route) => {
    actions.push(route.request().postDataJSON())
    return route.fulfill(
      actionFails
        ? { status: 503, json: { message: 'Change could not be saved. Try again.' } }
        : { json: { changed: true } },
    )
  })
  await page.goto('/?scope=support')
  await expect(page.getByRole('alert')).toContainText('Support service is temporarily unavailable')
  await expect(page.getByRole('heading', { name: 'No records yet' })).toHaveCount(0)
  readFails = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.getByRole('button', { name: /^Details for / }).click()
  await page.getByLabel('Reason for change').fill('Resolved the member request')
  await page.getByRole('button', { name: 'Save ticket' }).click()
  await expect(page.getByRole('alert')).toContainText('Change could not be saved')
  await expect(page.getByLabel('Reason for change')).toHaveValue('Resolved the member request')
  expect(actions).toHaveLength(1)
  actionFails = false
  await page.getByRole('button', { name: 'Save ticket' }).click()
  await expect(page.locator('.admin-notice')).toContainText('Ticket updated')
  expect(actions).toHaveLength(2)
  expect(actions[1].ticketId).toBe('ticket-01')
})

test('pagination and filtering keep record counts and pages consistent', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/admin/operations*', (route) =>
    new URL(route.request().url()).searchParams.get('scope') === 'users'
      ? route.fulfill({
          json: {
            scope: 'users',
            users: Array.from({ length: 21 }, (_, i) => ({
              user_id: `member-page-${i + 1}`,
              full_name: `Page User ${i + 1}`,
              normalized_email: `page-user-${i + 1}@wrs.test`,
              status: 'active',
              kyc_status: 'pending',
            })),
          },
        })
      : route.fallback(),
  )
  await page.goto('/?scope=users')
  await expect(page.getByText('Page User 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Page User 11', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Page User 21', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Search records' }).fill('member-page-3')
  await expect(page.getByText('Page User 3', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
  await expect(page.locator('.admin-pagination')).toContainText('1–1 of 1')
})

test('the operator menu signs out through the shared auth endpoint', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/auth/logout', (route) => route.fulfill({ json: { signedOut: true } }))
  await page.goto('/')
  await page.locator('summary[aria-label="Open my account"]').click()
  const request = page.waitForRequest('**/api/auth/logout')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  expect((await request).method()).toBe('POST')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
})

test('public, member and admin entry points load the styles needed by their routes', async ({ page }) => {
  await prepare(page)
  await page.goto('http://127.0.0.1:5190/')
  const publicHeading = page.getByRole('heading', { level: 1 })
  await expect(publicHeading).toBeVisible()
  expect(await publicHeading.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(30)
  await page.goto('http://127.0.0.1:5190/login')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '28px')
  await page.goto('http://127.0.0.1:5190/admin/operations?scope=users')
  await expect(page.locator('h1')).toHaveText('Users')
  await expect(page.locator('.admin-app')).toHaveCSS('background-color', 'rgb(17, 19, 21)')
})

test('reward changes retain saved confirmation when refreshing settings fails', async ({ page }) => {
  await prepare(page)
  let saved = false
  await page.route('**/api/admin/operations*', (route) => {
    if (new URL(route.request().url()).searchParams.get('scope') !== 'rewards') return route.fallback()
    return saved
      ? route.fulfill({ status: 503, json: { message: 'Settings are temporarily unavailable' } })
      : route.fulfill({ json: { scope: 'rewards', ...fixtures.rewards } })
  })
  await page.route('**/api/admin/action', (route) => {
    saved = true
    return route.fulfill({ json: { changed: true } })
  })
  await page.goto('/?scope=rewards')
  await page.getByLabel('Reason for reward rule change').fill('Approved reward update')
  await page.getByRole('button', { name: 'Activate XP rule' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Reward settings saved. Refresh to load the latest settings.' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Settings are temporarily unavailable')
})

test('every data page shows named context and statistics on a phone', async ({ page }) => {
  test.setTimeout(120000)
  await prepare(page)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [scope, group, expected] of [
    ['support', 'support', 'Ada Okafor'],
    ['finance', 'payments', 'Ada Okafor'],
    ['finance', 'withdrawals', 'Ada Okafor'],
    ['finance', 'settlements', 'Warehouse inspection'],
    ['deployments', 'deploymentRequests', 'Inventory check'],
    ['deployments', 'deployments', 'Warehouse inspection'],
    ['data', 'submissions', 'Ada Okafor'],
    ['data', 'taskResponses', 'Ada Okafor'],
    ['data', 'deletions', 'Ada Okafor'],
    ['risk', 'referrals', 'Ada Okafor'],
    ['risk', 'moderation', 'Ada community profile'],
  ]) {
    await page.goto(`/?scope=${scope}&page=${group}`)
    await expect(page.locator('.admin-page-stats')).toBeVisible()
    await expect(page.getByRole('table').getByText(expected, { exact: true })).toBeVisible()
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport)
  }
})

test('support shows real messages and submits the reply for that ticket', async ({ page }) => {
  await prepare(page)
  await page.goto('/?scope=support')
  await page.getByRole('button', { name: /^Details for / }).click()
  await expect(page.getByRole('region', { name: 'Conversation' })).toContainText('How can I finish my training?')
  await expect(page.getByRole('region', { name: 'Conversation' })).toContainText('Kwame Support')
  await page.getByLabel('Reply to user (optional)').fill('Your training task is ready to continue.')
  await page.getByLabel('Reason for change').fill('Answered training question')
  const request = page.waitForRequest('**/api/admin/action')
  await page.getByRole('button', { name: 'Save ticket' }).click()
  expect((await request).postDataJSON()).toMatchObject({
    action: 'support.update',
    ticketId: 'ticket-01',
    message: 'Your training task is ready to continue.',
  })
  await expect(page.locator('.admin-notice')).toContainText('Ticket updated')
})

test('referrals explain blocked approval and paid jobs cannot be paid twice', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/admin/operations*', (route) => {
    const scope = new URL(route.request().url()).searchParams.get('scope')
    if (scope === 'risk')
      return route.fulfill({
        json: {
          ...fixtures.risk,
          referrals: [
            {
              ...fixtures.risk.referrals[0],
              eligibility_status: 'unverified',
              eligibility_reason: 'Invited user email is not verified.',
            },
          ],
        },
      })
    if (scope === 'finance')
      return route.fulfill({
        json: {
          ...fixtures.finance,
          settlements: [
            { ...fixtures.finance.settlements[0], payout_status: 'settled', amount_minor: 250000, currency: 'NGN' },
          ],
        },
      })
    return route.fallback()
  })
  await page.goto('/?scope=risk&page=referrals')
  await page.getByRole('button', { name: /^Details for / }).click()
  const dialog = page.getByRole('dialog', { name: 'Selected record' })
  await expect(dialog.getByText('Invited user email is not verified.')).toBeVisible()
  await page.getByLabel('Reason for change').fill('Checked invited account')
  await expect(page.getByRole('button', { name: 'Approve referral' })).toBeDisabled()
  await page.goto('/?scope=finance&page=settlements')
  await page.getByRole('button', { name: /^Details for / }).click()
  await expect(page.getByRole('button', { name: 'Pay for job' })).toHaveCount(0)
})

test('updated pages produce readable desktop previews', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const [scope, group, label] of [
    ['support', 'support', 'support'],
    ['finance', 'payments', 'payments'],
    ['deployments', 'deployments', 'jobs'],
    ['data', 'taskResponses', 'training'],
    ['risk', 'referrals', 'referrals'],
    ['rewards', '', 'rewards'],
    ['access', '', 'team'],
  ]) {
    await page.goto(`/?scope=${scope}${group ? `&page=${group}` : ''}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    if (group) await expect(page.getByRole('table')).toBeVisible()
    else if (scope === 'access') await expect(page.getByRole('button', { name: /Kwame Support/ })).toBeVisible()
    else await expect(page.getByRole('heading', { name: 'Saved reward settings' })).toBeVisible()
    await page.screenshot({ path: `output/playwright/admin-${label}-redesign.png` })
  }
})
