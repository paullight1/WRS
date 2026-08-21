import { runtimeConfig } from './runtimeConfig.js'

export const SENSITIVE_ACTIONS = Object.freeze({
  'payment.checkout': { service: 'payments', risk: 'P0', disposition: 'demo-label', implemented: false },
  'payment.success': { service: 'payments', risk: 'P0', disposition: 'disable', implemented: false },
  'wallet.deposit': { service: 'payments', risk: 'P0', disposition: 'disable', implemented: false },
  'wallet.withdraw': { service: 'payments', risk: 'P0', disposition: 'disable', implemented: false },
  'reward.eventCode': { service: 'rewards', risk: 'P0', disposition: 'demo-label', implemented: false },
  'reward.boost': { service: 'rewards', risk: 'P1', disposition: 'demo-label', implemented: false },
  'training.biometricSubmit': { service: 'data', risk: 'P0', disposition: 'disable', implemented: false },
  'training.fileUpload': { service: 'data', risk: 'P1', disposition: 'disable', implemented: false },
  'data.taskSubmit': { service: 'data', risk: 'P1', disposition: 'demo-label', implemented: false },
  'deployment.request': { service: 'deployments', risk: 'P0', disposition: 'demo-label', implemented: false },
  'deployment.pause': { service: 'deployments', risk: 'P1', disposition: 'disable', implemented: false },
  'marketplace.purchase': { service: 'payments', risk: 'P1', disposition: 'demo-label', implemented: false },
  'account.deleteData': { service: 'data', risk: 'P0', disposition: 'disable', implemented: false },
  'support.ticket': { service: 'support', risk: 'P1', disposition: 'demo-label', implemented: false },
  'account.deleteAccount': { service: 'identity', risk: 'P0', disposition: 'disable', implemented: false },
})

const REQUIRED_IDS = Object.freeze([
  'payment.checkout',
  'payment.success',
  'wallet.deposit',
  'wallet.withdraw',
  'reward.eventCode',
  'reward.boost',
  'training.biometricSubmit',
  'training.fileUpload',
  'data.taskSubmit',
  'deployment.request',
  'deployment.pause',
  'marketplace.purchase',
  'account.deleteData',
  'support.ticket',
])

export function requiredSensitiveActionIds() {
  return REQUIRED_IDS
}

export function getSensitiveActionPolicy(id, config = runtimeConfig) {
  const action = SENSITIVE_ACTIONS[id]
  if (!action) throw new Error(`Unknown sensitive action: ${id}`)

  if (config.mode === 'demo') {
    return {
      id,
      enabled: action.disposition === 'demo-label',
      authoritative: false,
      demo: true,
      label: 'Demo only',
      reason:
        action.disposition === 'demo-label'
          ? 'Simulation only — no real transaction, upload, reward, or account change is created.'
          : 'Unavailable in demo mode because this action could be mistaken for a real sensitive operation.',
    }
  }

  const serviceReady = Boolean(config.services?.[action.service])
  const enabled = serviceReady && action.implemented
  return {
    id,
    enabled,
    authoritative: enabled,
    demo: false,
    label: enabled ? 'Live' : 'Unavailable',
    reason: enabled
      ? 'Authoritative service is enabled.'
      : serviceReady
        ? 'Service is configured, but this WRS action has not completed its production implementation gate.'
        : `${action.service} service unavailable; production defaults closed.`,
  }
}
