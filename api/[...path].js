import { json } from './_lib/http.js'

const routes = {
  '/api/academy': () => import('../server/routes/academy.js'),
  '/api/academy/assess': () => import('../server/routes/academy/assess.js'),
  '/api/academy/progress': () => import('../server/routes/academy/progress.js'),
  '/api/account': () => import('../server/routes/account.js'),
  '/api/account/delete': () => import('../server/routes/account/delete.js'),
  '/api/account/delete/process': () => import('../server/routes/account/delete/process.js'),
  '/api/account/profile': () => import('../server/routes/account/profile.js'),
  '/api/account/settings': () => import('../server/routes/account/settings.js'),
  '/api/admin/action': () => import('../server/routes/admin/action.js'),
  '/api/admin/operations': () => import('../server/routes/admin/operations.js'),
  '/api/auth/confirm': () => import('../server/routes/auth/confirm.js'),
  '/api/auth/login': () => import('../server/routes/auth/login.js'),
  '/api/auth/logout': () => import('../server/routes/auth/logout.js'),
  '/api/auth/mfa/disable': () => import('../server/routes/auth/mfa/disable.js'),
  '/api/auth/mfa/enroll': () => import('../server/routes/auth/mfa/enroll.js'),
  '/api/auth/mfa/step-up': () => import('../server/routes/auth/mfa/step-up.js'),
  '/api/auth/mfa/verify': () => import('../server/routes/auth/mfa/verify.js'),
  '/api/auth/oauth/callback': () => import('../server/routes/auth/oauth/callback.js'),
  '/api/auth/oauth/start': () => import('../server/routes/auth/oauth/start.js'),
  '/api/auth/password/forgot': () => import('../server/routes/auth/password/forgot.js'),
  '/api/auth/password/reset': () => import('../server/routes/auth/password/reset.js'),
  '/api/auth/register': () => import('../server/routes/auth/register.js'),
  '/api/auth/session': () => import('../server/routes/auth/session.js'),
  '/api/auth/verification/resend-confirmation': () =>
    import('../server/routes/auth/verification/resend-confirmation.js'),
  '/api/auth/verification/resend': () => import('../server/routes/auth/verification/resend.js'),
  '/api/auth/verification/start': () => import('../server/routes/auth/verification/start.js'),
  '/api/auth/verify': () => import('../server/routes/auth/verify.js'),
  '/api/certificates/verify': () => import('../server/routes/certificates/verify.js'),
  '/api/community': () => import('../server/routes/community.js'),
  '/api/community/attendance': () => import('../server/routes/community/attendance.js'),
  '/api/community/event': () => import('../server/routes/community/event.js'),
  '/api/community/moderate': () => import('../server/routes/community/moderate.js'),
  '/api/community/profile': () => import('../server/routes/community/profile.js'),
  '/api/data/consent': () => import('../server/routes/data/consent.js'),
  '/api/data/delete': () => import('../server/routes/data/delete.js'),
  '/api/data/delete/process': () => import('../server/routes/data/delete/process.js'),
  '/api/data/export': () => import('../server/routes/data/export.js'),
  '/api/data/licenses/distribute': () => import('../server/routes/data/licenses/distribute.js'),
  '/api/data/revenue': () => import('../server/routes/data/revenue.js'),
  '/api/data/review': () => import('../server/routes/data/review.js'),
  '/api/data/scan': () => import('../server/routes/data/scan.js'),
  '/api/data/submissions': () => import('../server/routes/data/submissions.js'),
  '/api/data/tasks/submit': () => import('../server/routes/data/tasks/submit.js'),
  '/api/data/upload-complete': () => import('../server/routes/data/upload-complete.js'),
  '/api/data/upload-grant': () => import('../server/routes/data/upload-grant.js'),
  '/api/deployments': () => import('../server/routes/deployments.js'),
  '/api/deployments/contract': () => import('../server/routes/deployments/contract.js'),
  '/api/deployments/incident': () => import('../server/routes/deployments/incident.js'),
  '/api/deployments/match': () => import('../server/routes/deployments/match.js'),
  '/api/deployments/request': () => import('../server/routes/deployments/request.js'),
  '/api/deployments/settle': () => import('../server/routes/deployments/settle.js'),
  '/api/deployments/state': () => import('../server/routes/deployments/state.js'),
  '/api/deployments/system-state': () => import('../server/routes/deployments/system-state.js'),
  '/api/deployments/telemetry': () => import('../server/routes/deployments/telemetry.js'),
  '/api/deployments/verify-work': () => import('../server/routes/deployments/verify-work.js'),
  '/api/health': () => import('../server/routes/health.js'),
  '/api/knowledge-base': () => import('../server/routes/knowledge-base.js'),
  '/api/marketplace': () => import('../server/routes/marketplace.js'),
  '/api/marketplace/install': () => import('../server/routes/marketplace/install.js'),
  '/api/marketplace/purchase': () => import('../server/routes/marketplace/purchase.js'),
  '/api/marketplace/review': () => import('../server/routes/marketplace/review.js'),
  '/api/payments/initialize': () => import('../server/routes/payments/initialize.js'),
  '/api/payments/reconcile': () => import('../server/routes/payments/reconcile.js'),
  '/api/payments/verify': () => import('../server/routes/payments/verify.js'),
  '/api/payments/webhook': () => import('../server/routes/payments/webhook.js'),
  '/api/referrals': () => import('../server/routes/referrals.js'),
  '/api/referrals/accept': () => import('../server/routes/referrals/accept.js'),
  '/api/referrals/qualify': () => import('../server/routes/referrals/qualify.js'),
  '/api/rewards': () => import('../server/routes/rewards.js'),
  '/api/rewards/boost': () => import('../server/routes/rewards/boost.js'),
  '/api/rewards/event-code-admin': () => import('../server/routes/rewards/event-code-admin.js'),
  '/api/rewards/event-code': () => import('../server/routes/rewards/event-code.js'),
  '/api/robot': () => import('../server/routes/robot.js'),
  '/api/robot/configuration': () => import('../server/routes/robot/configuration.js'),
  '/api/robot/onboarding': () => import('../server/routes/robot/onboarding.js'),
  '/api/robot/onboarding/complete': () => import('../server/routes/robot/onboarding/complete.js'),
  '/api/robot/passport': () => import('../server/routes/robot/passport.js'),
  '/api/robot/passport/pdf': () => import('../server/routes/robot/passport/pdf.js'),
  '/api/robot/passport/verify': () => import('../server/routes/robot/passport/verify.js'),
  '/api/support': () => import('../server/routes/support.js'),
  '/api/support/attachment': () => import('../server/routes/support/attachment.js'),
  '/api/support/ticket': () => import('../server/routes/support/ticket.js'),
  '/api/wallet': () => import('../server/routes/wallet.js'),
  '/api/wallet/payout-method': () => import('../server/routes/wallet/payout-method.js'),
  '/api/wallet/transactions': () => import('../server/routes/wallet/transactions.js'),
  '/api/wallet/withdraw': () => import('../server/routes/wallet/withdraw.js'),
}

export const routeManifest = Object.keys(routes)

const gateway = {
  async fetch(request) {
    const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/'
    const loadRoute = routes[pathname]
    if (!loadRoute) return json({ message: 'API route not found.', code: 'not-found' }, 404)

    const route = (await loadRoute()).default
    if (typeof route === 'function') return route(request)
    if (typeof route?.fetch === 'function') return route.fetch(request)
    return json({ message: 'API route is not configured.', code: 'route-unavailable' }, 500)
  },
}

export default gateway
