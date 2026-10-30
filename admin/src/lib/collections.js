export const COLLECTIONS = {
  support: {
    columns: [
      ['subject', 'Question'],
      ['user_name', 'User'],
      ['priority', 'Priority'],
    ],
    stats: [
      ['total', 'All tickets'],
      ['open', 'Needs a reply'],
      ['waiting', 'Waiting for user'],
      ['resolved', 'Finished'],
    ],
    fields: ['user_name', 'user_email', 'category', 'priority', 'status', 'assigned_name', 'created_at', 'resolved_at'],
  },
  payments: {
    columns: [
      ['user_name', 'User'],
      ['package_slug', 'Plan'],
      ['amount_minor', 'Amount'],
    ],
    stats: [
      ['total', 'All payments'],
      ['paid', 'Paid'],
      ['pending', 'Pending'],
      ['failed', 'Failed or returned'],
    ],
    fields: ['user_name', 'user_email', 'package_slug', 'amount_minor', 'status', 'created_at', 'updated_at'],
    note: 'Payment updates come from the payment provider.',
  },
  withdrawals: {
    columns: [
      ['user_name', 'User'],
      ['amount_minor', 'Amount'],
    ],
    stats: [
      ['total', 'All withdrawals'],
      ['inProgress', 'Processing'],
      ['paid', 'Paid'],
      ['failed', 'Failed or returned'],
    ],
    fields: ['user_name', 'user_email', 'amount_minor', 'status', 'created_at', 'updated_at'],
    note: 'Withdrawals are processed by the payout service.',
  },
  settlements: {
    columns: [
      ['job_title', 'Job'],
      ['user_name', 'User'],
      ['amount_minor', 'Payout'],
    ],
    stats: [
      ['total', 'Completed jobs'],
      ['ready', 'Awaiting payout'],
      ['paid', 'Paid'],
    ],
    statusField: 'payout_status',
    fields: [
      'job_title',
      'robot_name',
      'user_name',
      'user_email',
      'amount_minor',
      'gross_minor',
      'fee_minor',
      'payout_status',
      'completed_at',
      'settled_at',
    ],
  },
  deploymentRequests: {
    columns: [
      ['job_title', 'Job requested'],
      ['robot_name', 'Robot'],
      ['user_name', 'User'],
    ],
    stats: [
      ['total', 'All requests'],
      ['requested', 'Awaiting assignment'],
      ['matched', 'Assigned'],
      ['cancelled', 'Cancelled'],
    ],
    fields: [
      'job_title',
      'robot_name',
      'user_name',
      'user_email',
      'status',
      'rate_minor',
      'rate_unit',
      'requested_at',
      'matched_at',
    ],
  },
  deployments: {
    columns: [
      ['job_title', 'Job'],
      ['robot_name', 'Robot'],
      ['user_name', 'User'],
    ],
    stats: [
      ['total', 'All jobs'],
      ['active', 'Ongoing jobs'],
      ['completed', 'Completed'],
      ['failed', 'Stopped'],
    ],
    fields: [
      'job_title',
      'job_description',
      'robot_name',
      'user_name',
      'user_email',
      'status',
      'starts_at',
      'ends_at',
      'completed_at',
    ],
  },
  submissions: {
    columns: [
      ['user_name', 'Submitted by'],
      ['data_category', 'Data type'],
      ['quality_score', 'Quality score'],
    ],
    stats: [
      ['total', 'All submissions'],
      ['pending', 'Needs review'],
      ['approved', 'Approved'],
      ['rejected', 'Rejected'],
    ],
    fields: [
      'user_name',
      'user_email',
      'data_category',
      'mime_type',
      'size_bytes',
      'scan_status',
      'status',
      'quality_score',
      'review_notes',
      'submitted_at',
      'reviewed_at',
    ],
  },
  taskResponses: {
    columns: [
      ['task_slug', 'Training task'],
      ['user_name', 'Submitted by'],
      ['quality_score', 'Quality score'],
    ],
    stats: [
      ['total', 'All answers'],
      ['pending', 'Needs review'],
      ['approved', 'Approved'],
      ['rejected', 'Rejected'],
    ],
    fields: ['user_name', 'user_email', 'data_category', 'status', 'quality_score', 'submitted_at', 'reviewed_at'],
  },
  deletions: {
    columns: [
      ['user_name', 'Requested by'],
      ['data_category', 'Data type'],
      ['requested_at', 'Requested'],
    ],
    stats: [
      ['total', 'All requests'],
      ['pending', 'Waiting'],
      ['completed', 'Completed'],
      ['failed', 'Needs attention'],
    ],
    fields: [
      'user_name',
      'user_email',
      'data_category',
      'reason',
      'status',
      'eligible_at',
      'requested_at',
      'completed_at',
    ],
    note: 'Track progress from the deletion service.',
  },
  referrals: {
    columns: [
      ['referred_name', 'New user'],
      ['referrer_name', 'Invited by'],
      ['eligibility_reason', 'Approval check'],
    ],
    stats: [
      ['total', 'All referrals'],
      ['pending', 'Pending'],
      ['qualified', 'Approved'],
      ['rejected', 'Rejected'],
    ],
    fields: [
      'referred_name',
      'referred_email',
      'referrer_name',
      'referrer_email',
      'referral_code',
      'status',
      'eligible_at',
      'qualified_at',
      'created_at',
    ],
  },
  moderation: {
    columns: [
      ['target_name', 'Content'],
      ['action', 'Review outcome'],
      ['reason', 'Note'],
    ],
    stats: [
      ['total', 'Review notes'],
      ['profiles', 'Profile reviews'],
      ['events', 'Event reviews'],
      ['announcements', 'Announcements'],
    ],
    statusField: null,
    fields: ['target_name', 'target_type', 'action', 'reason', 'reviewer_name', 'created_at'],
  },
}

export function rowTitle(group, row) {
  if (group === 'users') return row.full_name || row.normalized_email || 'Name unavailable'
  if (group === 'support') return row.subject || 'Support question'
  if (group === 'referrals') return row.referred_name || 'User name unavailable'
  if (group === 'moderation') return row.target_name || 'Community review'
  if (group === 'taskResponses') return row.task_slug ? row.task_slug.replaceAll('-', ' ') : 'Training answer'
  if (['deployments', 'deploymentRequests', 'settlements'].includes(group))
    return row.job_title || 'Job details unavailable'
  return row.user_name || 'User name unavailable'
}
