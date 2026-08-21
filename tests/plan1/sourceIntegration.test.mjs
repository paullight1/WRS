import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const guardedScreens = [
  ['src/screens/Checkout.jsx', 'payment.checkout'],
  ['src/screens/Wallet.jsx', 'wallet.deposit'],
  ['src/screens/Wallet.jsx', 'wallet.withdraw'],
  ['src/screens/EventCode.jsx', 'reward.eventCode'],
  ['src/screens/Boosts.jsx', 'reward.boost'],
  ['src/screens/TrainingModule.jsx', 'training.biometricSubmit'],
  ['src/screens/TrainingModule.jsx', 'training.fileUpload'],
  ['src/screens/DataTask.jsx', 'data.taskSubmit'],
  ['src/screens/DeploymentDetails.jsx', 'deployment.request'],
  ['src/screens/ActiveDeployment.jsx', 'deployment.pause'],
  ['src/screens/Marketplace.jsx', 'marketplace.purchase'],
  ['src/screens/Settings.jsx', 'account.deleteData'],
  ['src/screens/Support.jsx', 'support.ticket'],
]

test('every audited sensitive screen consumes the centralized policy', () => {
  for (const [path, action] of guardedScreens) {
    const source = read(path)
    assert.match(source, /getSensitiveActionPolicy/, `${path} does not import/use the policy engine`)
    assert.ok(source.includes(`'${action}'`) || source.includes(`"${action}"`), `${path} missing ${action}`)
  }
})

test('payment success route uses verified access evaluation rather than route presence', () => {
  const source = read('src/screens/PaymentSuccess.jsx')
  assert.match(source, /evaluatePaymentSuccessAccess/)
  assert.match(source, /location\.search|useLocation/)
})

test('app shell visibly identifies demo application data', () => {
  const source = read('src/components/AppShell.jsx')
  assert.match(source, /runtimeConfig/)
  assert.match(source, /Demo data|illustrative/i)
})

test('active-looking operational screens no longer ship stale 2025 dates', () => {
  for (const path of [
    'src/screens/DataTask.jsx',
    'src/screens/DeploymentDetails.jsx',
    'src/screens/Transactions.jsx',
    'src/screens/Referrals.jsx',
  ]) {
    assert.doesNotMatch(read(path), /\b2025\b/, `${path} still contains stale 2025 operational content`)
  }
})

test('sensitive-action inventory is mirrored in production-readiness documentation', () => {
  const inventory = read('Docs/production-readiness/01-safety-lockdown/SENSITIVE-ACTIONS.md')
  for (const [, action] of guardedScreens) assert.ok(inventory.includes(action), `docs missing ${action}`)
  assert.match(inventory, /P0/)
  assert.match(inventory, /demo-label|disable/)
})
