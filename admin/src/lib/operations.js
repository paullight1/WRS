// Pages share permission scopes, but each task has its own URL and workspace.
export const AREAS = [
  {
    key: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    description: 'Users, activity and work waiting for review.',
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'group',
    description: 'Find people and manage their accounts.',
    groups: [
      ['users', 'Users'],
      ['identity', 'Identity checks'],
    ],
    columns: [
      ['full_name', 'User'],
      ['kyc_status', 'Identity check'],
      ['country_code', 'Country'],
    ],
  },
  {
    key: 'support',
    label: 'Support',
    icon: 'support_agent',
    description: 'Read questions and reply to users.',
    groups: [['support', 'Support']],
    columns: [
      ['subject', 'Question'],
      ['category', 'Topic'],
      ['priority', 'Priority'],
    ],
  },
  {
    key: 'finance',
    label: 'Money',
    icon: 'account_balance',
    description: 'Payments and money going out.',
    groups: [
      ['payments', 'Payments'],
      ['withdrawals', 'Withdrawals'],
      ['settlements', 'Job payouts'],
    ],
    columns: [
      ['id', 'Reference'],
      ['amount_minor', 'Amount'],
      ['user_id', 'User'],
    ],
  },
  {
    key: 'deployments',
    label: 'Jobs',
    icon: 'work',
    description: 'New requests and assigned robot jobs.',
    groups: [
      ['deploymentRequests', 'Job requests'],
      ['deployments', 'Assigned jobs'],
    ],
    columns: [
      ['id', 'Job'],
      ['robot_id', 'Robot'],
      ['user_id', 'User'],
    ],
  },
  {
    key: 'data',
    label: 'Data',
    icon: 'dataset',
    description: 'Review submitted data and training answers.',
    groups: [
      ['submissions', 'Data submissions'],
      ['taskResponses', 'Training reviews'],
      ['deletions', 'Deletion requests'],
    ],
    columns: [
      ['id', 'Submission'],
      ['quality_score', 'Quality score'],
    ],
  },
  {
    key: 'risk',
    label: 'Community',
    icon: 'forum',
    description: 'Referrals and community activity.',
    groups: [
      ['referrals', 'Referrals'],
      ['moderation', 'Community reviews'],
    ],
    columns: [
      ['id', 'Referral'],
      ['referred_user_id', 'Invited user'],
      ['eligible_at', 'Ready for review'],
    ],
  },
  { key: 'rewards', label: 'Rewards', icon: 'workspace_premium', description: 'Set XP rewards and RBC limits.' },
  {
    key: 'access',
    label: 'Team access',
    icon: 'admin_panel_settings',
    description: 'Choose what each team member can manage.',
  },
]
export const PAGE_DESCRIPTIONS = {
  users: 'Find people and manage their accounts.',
  identity: 'Review pending identity checks.',
  payments: 'Payments made by users.',
  withdrawals: 'Track users’ withdrawal requests.',
  settlements: 'Pay for completed robot jobs.',
  deploymentRequests: 'Review requests and assign robots to jobs.',
  deployments: 'Track assigned robot jobs.',
  submissions: 'Review the quality of submitted data.',
  taskResponses: 'Check answers to training tasks.',
  deletions: 'Track requests to delete submitted data.',
  referrals: 'Review users who joined through an invitation.',
  moderation: 'Read community review history and add notes.',
}
export function pageForArea(area, requested) {
  if (!area?.groups) return area
  const group = area.groups.find(([key]) => key === requested) || area.groups[0]
  return {
    ...area,
    page: group[0],
    label: group[1],
    description: PAGE_DESCRIPTIONS[group[0]] || area.description,
    groups: [[group[0] === 'identity' ? 'users' : group[0], group[1]]],
  }
}
export const metricPage = (key) =>
  ({
    kyc_pending: 'identity',
    withdrawals_in_progress: 'withdrawals',
    data_deletions_due: 'deletions',
    data_task_responses_review: 'taskResponses',
  })[key]
const ROLE_SCOPE = {
  support_operator: ['overview', 'support'],
  kyc_operator: ['overview', 'users'],
  finance_operator: ['overview', 'finance'],
  deployment_operator: ['overview', 'deployments'],
  data_operator: ['overview', 'data'],
  risk_operator: ['overview', 'risk'],
  reward_operator: ['overview', 'rewards'],
}
export function areasForRoles(roles = []) {
  const allowed = roles.includes('admin')
    ? AREAS.map(({ key }) => key)
    : [...new Set(roles.flatMap((role) => ROLE_SCOPE[role] || []))]
  return AREAS.filter(({ key }) => allowed.includes(key))
}
export const ACTIONS = {
  'kyc.set': {
    group: 'users',
    role: 'kyc_operator',
    label: 'Update identity check',
    submit: 'Save identity check',
    success: 'Identity check updated.',
    target: 'userId',
    fields: ['user_id', 'id'],
    mfa: true,
  },
  'user.suspend': {
    group: 'users',
    label: 'Suspend account',
    submit: 'Suspend account',
    success: 'Account suspended.',
    target: 'userId',
    fields: ['user_id', 'id'],
    mfa: true,
    destructive: true,
  },
  'user.restore': {
    group: 'users',
    label: 'Restore account',
    submit: 'Restore account',
    success: 'Account restored.',
    target: 'userId',
    fields: ['user_id', 'id'],
    mfa: true,
  },
  'support.update': {
    group: 'support',
    role: 'support_operator',
    label: 'Update ticket',
    submit: 'Save ticket',
    success: 'Ticket updated.',
    target: 'ticketId',
    fields: ['id', 'ticket_id'],
  },
  'deployment.match': {
    group: 'deploymentRequests',
    role: 'deployment_operator',
    label: 'Assign job',
    submit: 'Assign job',
    success: 'Job assigned.',
    target: 'requestId',
    fields: ['id'],
  },
  'deployment.settle': {
    group: 'settlements',
    role: 'finance_operator',
    label: 'Pay for job',
    submit: 'Pay for job',
    success: 'Job payout completed.',
    target: 'deploymentId',
    fields: ['id'],
    mfa: true,
  },
  'data.review': {
    group: 'submissions',
    role: 'data_operator',
    label: 'Review submission',
    submit: 'Save review',
    success: 'Review saved.',
    target: 'submissionId',
    fields: ['id', 'submission_id'],
  },
  'data.task.review': {
    group: 'taskResponses',
    role: 'data_operator',
    label: 'Review training answer',
    submit: 'Save review',
    success: 'Review saved.',
    target: 'responseId',
    fields: ['id', 'response_id'],
  },
  'referral.qualify': {
    group: 'referrals',
    role: 'risk_operator',
    label: 'Approve referral',
    submit: 'Approve referral',
    success: 'Referral approved.',
    target: 'relationshipId',
    fields: ['id', 'relationship_id'],
  },
  'community.moderate': {
    group: 'moderation',
    role: 'risk_operator',
    label: 'Add review note',
    submit: 'Save review note',
    success: 'Review note saved.',
    target: 'targetId',
    fields: ['target_id'],
  },
}
export function recordActions(group, roles, row) {
  return Object.entries(ACTIONS).filter(
    ([key, action]) =>
      action.group === group &&
      row.status !== 'deleted' &&
      (key !== 'deployment.match' || row.status === 'requested') &&
      (key !== 'deployment.settle' ||
        (row.status === 'completed' &&
          !row.settlement_unavailable &&
          !['settled', 'paid', 'reversed', 'unavailable'].includes(row.payout_status))) &&
      (key !== 'referral.qualify' || row.status === 'pending') &&
      (key !== 'data.task.review' || ['submitted', 'review'].includes(row.status)) &&
      (roles.includes('admin') || roles.includes(action.role)) &&
      (key !== 'user.restore' || row.status === 'suspended') &&
      (key !== 'user.suspend' || row.status !== 'suspended'),
  )
}
export const QUALITY_FIELDS = {
  completeness: 'Complete information',
  accuracy: 'Correct information',
  consistency: 'Consistent information',
  signalQuality: 'Clear data',
  reviewerAgreement: 'Reviewers agree',
  policyCompliance: 'Follows the rules',
}
const WORDS = {
  waiting_user: 'Waiting for user',
  provider_pending: 'Processing',
  in_progress: 'In progress',
  qualified: 'Approved',
  deployment: 'Jobs',
  community_profile: 'Community profile',
  moderation: 'Community reviews',
  succeeded: 'Paid',
  initialized: 'Not paid yet',
  matched: 'Assigned',
  ready: 'Awaiting payout',
  settled: 'Paid',
  unpaid: 'Awaiting payout',
  reserved: 'Processing',
  cancelled: 'Cancelled',
}
export const humanize = (value) =>
  (typeof WORDS[value] === 'string' ? WORDS[value] : '') ||
  String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
export const dateValue = (row) =>
  row.updated_at || row.reviewed_at || row.completed_at || row.submitted_at || row.requested_at || row.created_at
export function displayValue(key, value, row = {}) {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'country_code') {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(value) || value
    } catch {
      return value
    }
  }
  if (key.endsWith('_minor') && row.currency) {
    try {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: row.currency }).format(Number(value) / 100)
    } catch {
      return `${Number(value) / 100} ${row.currency}`
    }
  }
  if (key === 'size_bytes')
    return Number(value) >= 1048576
      ? `${(Number(value) / 1048576).toFixed(1)} MB`
      : `${Math.ceil(Number(value) / 1024)} KB`
  if (key.endsWith('_at') || key === 'date') {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
  }
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([name, item]) => `${humanize(name)}: ${typeof item === 'object' ? JSON.stringify(item) : item}`)
      .join('\n')
  if (
    [
      'status',
      'kyc_status',
      'priority',
      'category',
      'data_category',
      'target_type',
      'action',
      'task_slug',
      'package_slug',
      'payout_status',
    ].includes(key)
  )
    return humanize(value)
  return String(value)
}
export const METRICS = {
  kyc_pending: 'Identity checks to review',
  support_open: 'Open tickets',
  withdrawals_in_progress: 'Pending withdrawals',
  deployment_requests: 'Job requests',
  data_submissions_review: 'Data to review',
  data_task_responses_review: 'Training answers to review',
  data_deletions_due: 'Deletion requests ready',
  referrals_pending: 'Pending referrals',
  reward_policy: 'RBC rewards',
}
export const POLICY_STATES = {
  active_enabled: 'RBC enabled',
  active_disabled: 'RBC paused',
  disabled: 'No active rule',
}

export const FIELD_LABELS = {
  eligibility_reason: 'Approval check',
  user_name: 'User',
  user_email: 'Email',
  referred_name: 'New user',
  referred_email: 'New user email',
  referrer_name: 'Invited by',
  referrer_email: 'Inviter email',
  assigned_name: 'Assigned to',
  robot_name: 'Robot',
  job_title: 'Job',
  job_description: 'Job details',
  rate_minor: 'Rate',
  rate_unit: 'Pay per',
  net_minor: 'Payout amount',
  gross_minor: 'Before fees',
  fee_minor: 'Fee',
  payout_status: 'Payout status',
  settled_at: 'Paid on',
  mime_type: 'File type',
  size_bytes: 'File size',
  scan_status: 'File safety check',
  review_notes: 'Review notes',
  reviewer_name: 'Reviewed by',
  target_name: 'Content',
  target_content: 'Published content',
  referral_code: 'Invite code',
  starts_at: 'Starts',
  ends_at: 'Ends',
  full_name: 'Name',
  normalized_email: 'Email',
  user_id: 'User reference',
  id: 'Reference',
  kyc_status: 'Identity check',
  country_code: 'Country',
  email_verified_at: 'Email confirmed',
  phone_verified_at: 'Phone confirmed',
  created_at: 'Joined',
  updated_at: 'Last updated',
  assigned_operator_id: 'Assigned team member',
  amount_minor: 'Amount',
  package_slug: 'Plan',
  robot_id: 'Robot reference',
  opportunity_id: 'Job opening reference',
  version: 'Version',
  requested_at: 'Requested',
  matched_at: 'Assigned',
  submitted_at: 'Submitted',
  reviewed_at: 'Reviewed',
  completed_at: 'Completed',
  quality_score: 'Quality score',
  data_category: 'Data type',
  task_slug: 'Training task',
  response: 'Answer',
  eligible_at: 'Ready for review',
  attempt_count: 'Attempts',
  referrer_user_id: 'Invited by',
  referred_user_id: 'Invited user',
  qualified_at: 'Approved',
  target_id: 'Content reference',
  target_type: 'Content type',
  operator_reference: 'Team reference',
}
export const fieldLabel = (key) => (typeof FIELD_LABELS[key] === 'string' ? FIELD_LABELS[key] : humanize(key))
export function personName(row) {
  return row.full_name || row.normalized_email || 'Name unavailable'
}
