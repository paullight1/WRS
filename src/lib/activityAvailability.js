const lockedRoots = [
  '/training',
  '/data',
  '/wallet/data-revenue',
  '/rewards',
  '/academy',
  '/community',
  '/referrals',
  '/packages',
]

const comingSoonRoots = ['/marketplace']

export function isActivityLocked(pathname) {
  return lockedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
}

export function isActivityComingSoon(pathname) {
  return comingSoonRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
}
