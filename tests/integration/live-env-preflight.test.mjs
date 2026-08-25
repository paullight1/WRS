import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve(process.cwd(), 'scripts/validate-live-env.mjs')

const secret = (letter) => letter.repeat(48)

function validEnv(mode = 'staging') {
  return {
    PATH: process.env.PATH,
    VITE_WRS_MODE: mode,
    VITE_WRS_AUTHORITY_URL: `https://${mode}.wrs.test`,
    VITE_WRS_PAYMENT_SERVICE: 'true',
    VITE_WRS_IDENTITY_SERVICE: 'true',
    VITE_WRS_ROBOT_SERVICE: 'true',
    VITE_WRS_DATA_SERVICE: 'true',
    VITE_WRS_REWARD_SERVICE: 'true',
    VITE_WRS_DEPLOYMENT_SERVICE: 'true',
    VITE_WRS_SUPPORT_SERVICE: 'true',
    SUPABASE_URL: `https://${mode}abc.supabase.co`,
    SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${secret('p')}`,
    SUPABASE_SECRET_KEY: `sb_secret_${secret('s')}`,
    PAYSTACK_SECRET_KEY: mode === 'production' ? `sk_live_${secret('l')}` : `sk_test_${secret('t')}`,
    WRS_DATA_BUCKET: `wrs-${mode}-private-data`,
    WRS_DATA_SCANNER_SECRET: secret('a'),
    WRS_DATA_REVIEW_SECRET: secret('b'),
    WRS_DATA_DELETION_SECRET: secret('c'),
    WRS_DEPLOYMENT_OPERATIONS_SECRET: secret('d'),
    WRS_ECOSYSTEM_OPERATOR_TOKEN: secret('e'),
    WRS_ACADEMY_ASSESSOR_TOKEN: secret('f'),
    WRS_COMMUNITY_OPERATOR_TOKEN: secret('g'),
    WRS_REFERRAL_QUALIFIER_TOKEN: secret('h'),
    WRS_ACCOUNT_DELETION_WORKER_TOKEN: secret('i'),
  }
}

function run(env) {
  return spawnSync(process.execPath, [script], { env, encoding: 'utf8' })
}

describe('Plan 11 live environment preflight', () => {
  it('fails closed when live infrastructure is missing', () => {
    const result = run({ PATH: process.env.PATH })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('preflight FAILED')
  })

  it('accepts a complete staging authority with a sandbox payment key', () => {
    const result = run(validEnv('staging'))
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('preflight PASS (staging)')
  })

  it('rejects a production environment carrying a sandbox payment key', () => {
    const env = validEnv('production')
    env.PAYSTACK_SECRET_KEY = `sk_test_${secret('x')}`
    const result = run(env)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('production PAYSTACK_SECRET_KEY must be a Paystack live key')
  })
})
