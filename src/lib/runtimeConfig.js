const MODES = new Set(['demo', 'staging', 'production'])

const SERVICE_ENV = {
  payments: 'VITE_WRS_PAYMENT_SERVICE',
  identity: 'VITE_WRS_IDENTITY_SERVICE',
  data: 'VITE_WRS_DATA_SERVICE',
  rewards: 'VITE_WRS_REWARD_SERVICE',
  deployments: 'VITE_WRS_DEPLOYMENT_SERVICE',
  support: 'VITE_WRS_SUPPORT_SERVICE',
}

const enabled = (value) =>
  ['1', 'true', 'enabled', 'on'].includes(
    String(value || '')
      .trim()
      .toLowerCase(),
  )

export function parseRuntimeConfig(env = {}) {
  const mode = String(env.VITE_WRS_MODE || 'demo')
    .trim()
    .toLowerCase()
  if (!MODES.has(mode)) {
    throw new Error(`Invalid VITE_WRS_MODE "${env.VITE_WRS_MODE}". Expected demo, staging, or production.`)
  }

  const services = Object.fromEntries(Object.entries(SERVICE_ENV).map(([name, key]) => [name, enabled(env[key])]))

  return Object.freeze({
    mode,
    isDemo: mode === 'demo',
    isStaging: mode === 'staging',
    isProduction: mode === 'production',
    authorityUrl: String(env.VITE_WRS_AUTHORITY_URL || '').trim(),
    services: Object.freeze(services),
  })
}

export function assertProductionConfig(config) {
  if (!config?.isProduction) return config

  const missing = []
  if (!config.authorityUrl) missing.push('VITE_WRS_AUTHORITY_URL')
  for (const [service, key] of Object.entries(SERVICE_ENV)) {
    if (!config.services?.[service]) missing.push(key)
  }

  if (missing.length) {
    throw new Error(`Invalid production configuration: missing ${missing.join(', ')}`)
  }
  return config
}

const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
export const runtimeConfig = parseRuntimeConfig(viteEnv)
if (runtimeConfig.isProduction) assertProductionConfig(runtimeConfig)
