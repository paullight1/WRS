// Editable examples from the WRS reward policy. These are never activated automatically.
export const activityPresets = [
  { source: 'daily', name: 'Daily activity', xp: 10, rbc: '0', miningPower: 0, dailyLimit: 1 },
  { source: 'profile', name: 'Complete profile', xp: 50, rbc: '0', miningPower: 0, dailyLimit: 1 },
  { source: 'verification', name: 'Verify account', xp: 100, rbc: '0', miningPower: 0, dailyLimit: 1 },
  { source: 'training', name: 'Approved robot training', xp: 20, rbc: '0', miningPower: 0, dailyLimit: 10 },
  { source: 'data-task', name: 'Approved data task', xp: 30, rbc: '0.5', miningPower: 5, dailyLimit: 10 },
  { source: 'validation', name: 'Verified validation task', xp: 30, rbc: '0.5', miningPower: 0, dailyLimit: 10 },
  { source: 'academy', name: 'Academy certification', xp: 200, rbc: '2', miningPower: 50, dailyLimit: 1 },
  { source: 'community', name: 'Verified community event', xp: 50, rbc: '1', miningPower: 0, dailyLimit: 1 },
  { source: 'referral', name: 'Qualified referral', xp: 50, rbc: '0', miningPower: 0, dailyLimit: 1 },
  { source: 'mission', name: 'Verified WRS mission', xp: 100, rbc: '2', miningPower: 0, dailyLimit: 1 },
] as const

export const minerLevelPresets = [
  { level: 1, code: 'new-miner', name: 'New Miner', requiredXp: 0, multiplierBps: 10000, requiredAchievementCodes: [] },
  {
    level: 2,
    code: 'verified-miner',
    name: 'Verified Miner',
    requiredXp: 500,
    multiplierBps: 12000,
    requiredAchievementCodes: ['account-verified'],
  },
  {
    level: 3,
    code: 'active-miner',
    name: 'Active Miner',
    requiredXp: 2000,
    multiplierBps: 15000,
    requiredAchievementCodes: ['active-contributor'],
  },
  {
    level: 4,
    code: 'community-miner',
    name: 'Community Miner',
    requiredXp: 5000,
    multiplierBps: 20000,
    requiredAchievementCodes: ['community-participation'],
  },
  {
    level: 5,
    code: 'skilled-miner',
    name: 'Skilled Miner',
    requiredXp: 10000,
    multiplierBps: 25000,
    requiredAchievementCodes: ['quality-contributor'],
  },
  {
    level: 6,
    code: 'advanced-miner',
    name: 'Advanced Miner',
    requiredXp: 25000,
    multiplierBps: 30000,
    requiredAchievementCodes: ['advanced-contributor'],
  },
  {
    level: 7,
    code: 'elite-miner',
    name: 'Elite Miner',
    requiredXp: 50000,
    multiplierBps: 40000,
    requiredAchievementCodes: ['elite-contributor'],
  },
] as const

export function decimalToAtomic(value: string, scale: number): string {
  if (!Number.isInteger(scale) || scale < 0 || scale > 12) throw new Error('Invalid RBC precision.')
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('Enter a non-negative RBC amount.')
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > scale) throw new Error(`RBC amounts support ${scale} decimal places.`)
  const amount = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0')
  if (amount > 9223372036854775807n) throw new Error('RBC amount is too large.')
  return amount.toString()
}
