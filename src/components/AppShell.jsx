import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider.jsx'
import { Icon } from './ui.jsx'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { demoDataLabel } from '../lib/mockDataPolicy.js'

/** Retired: the page background is a flat surface now. */
export function Atmosphere() {
  return null
}

export function UserAvatar({ size = 40, className = '' }) {
  const auth = useAuth()
  const label = auth.isDemo ? 'DE' : 'WR'
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-primary-container/35 text-label-md text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

export function TopBar({ title, back, subtitle, right, avatar, onMenu }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 4)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`bar-blur sticky top-0 z-sticky px-margin-page pb-2.5 pt-[max(10px,env(safe-area-inset-top))] transition-colors duration-fast ${
        scrolled ? 'border-b border-white/8' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[720px] items-center gap-2">
        {back ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="tap -ml-2.5 grid shrink-0 place-items-center rounded-full transition-colors duration-fast hover:bg-white/[.06]"
            aria-label="Go back"
          >
            <Icon name="arrow_back" className="text-on-surface" />
          </button>
        ) : avatar ? (
          <Link to="/profile" className="tap -ml-1 grid shrink-0 place-items-center" aria-label="Your profile">
            <UserAvatar size={36} />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-headline-md text-headline-md text-on-surface">{title}</h1>
          {subtitle && <p className="truncate text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center">
          {right}
          <Link
            to="/notifications"
            className="tap grid place-items-center rounded-full transition-colors duration-fast hover:bg-white/[.06]"
            aria-label="Notifications"
          >
            <Icon name="notifications" className="text-on-surface" />
          </Link>
          {onMenu && (
            <button
              type="button"
              onClick={onMenu}
              className="tap -mr-2.5 grid place-items-center rounded-full transition-colors duration-fast hover:bg-white/[.06] lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" className="text-on-surface" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

const bottomNav = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/robot', icon: 'smart_toy', label: 'Robot' },
  { to: '/deploy', icon: 'rocket_launch', label: 'Deploy' },
  { to: '/marketplace', icon: 'storefront', label: 'Market' },
  { to: '/more', icon: 'more_horiz', label: 'More' },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-nav bg-surface-container-lowest pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <ul className="mx-auto flex max-w-[560px] items-stretch px-2">
        {bottomNav.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `tap flex w-full flex-col items-center justify-center gap-1 py-0.5 transition-colors duration-fast ${
                  isActive ? 'text-primary' : 'text-outline'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-16 place-items-center rounded-full transition-colors duration-fast ${
                      isActive ? 'bg-primary-container/30' : ''
                    }`}
                  >
                    <Icon name={item.icon} fill={isActive} className="text-[22px]" />
                  </span>
                  <span className={`text-[11px] leading-tight ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const drawerGroups = [
  {
    label: 'Robot',
    items: [
      { to: '/home', icon: 'home', label: 'Home' },
      { to: '/robot', icon: 'smart_toy', label: 'My Robot' },
      { to: '/training', icon: 'model_training', label: 'Train Robot' },
      { to: '/data', icon: 'dataset', label: 'Add Data' },
      { to: '/deploy', icon: 'rocket_launch', label: 'Deployment' },
    ],
  },
  {
    label: 'Value',
    items: [
      { to: '/wallet', icon: 'account_balance_wallet', label: 'Wallet & Earnings' },
      { to: '/rewards', icon: 'workspace_premium', label: 'Points & Rewards' },
      { to: '/marketplace', icon: 'storefront', label: 'Marketplace' },
      { to: '/referrals', icon: 'group_add', label: 'Referrals' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { to: '/academy', icon: 'school', label: 'Robot Academy' },
      { to: '/community', icon: 'groups', label: 'Community' },
      { to: '/support', icon: 'help_outline', label: 'Support' },
    ],
  },
]

function desktopViewport() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1024px)').matches
    : false
}

export function Drawer({ open, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [desktop, setDesktop] = useState(desktopViewport)

  useEffect(() => {
    queueMicrotask(() => onClose?.())
  }, [location.pathname, onClose])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = (event) => setDesktop(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const logout = async () => {
    await auth.logout()
    onClose?.()
    navigate('/login', { replace: true })
  }

  const accountTitle = auth.isDemo ? 'Demo account' : 'WRS account'
  const accountId = auth.session?.userId || 'No verified session'
  const mobileHidden = !desktop && !open

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={!open}
        aria-hidden={!open || undefined}
        aria-label="Close menu"
        className={`fixed inset-0 z-scrim bg-black/60 transition-opacity duration-slow lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        aria-label="Sections"
        aria-hidden={mobileHidden || undefined}
        inert={mobileHidden ? '' : undefined}
        className={`fixed inset-y-0 left-0 z-drawer flex w-[288px] flex-col border-r border-white/8 bg-surface-container-lowest transition-transform duration-slow ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 pb-4 pt-[max(20px,env(safe-area-inset-top))]">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-fast hover:bg-white/[.06]"
          >
            <UserAvatar size={40} />
            <span className="min-w-0">
              <span className="block truncate text-title text-on-surface">{accountTitle}</span>
              <span className="block truncate font-data text-data-sm text-on-surface-variant">{accountId}</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
          {drawerGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-4 pb-1.5 text-label-sm text-outline">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `tap flex items-center gap-3 rounded-xl px-4 text-title transition-colors duration-fast ${
                      isActive
                        ? 'bg-primary-container/20 text-primary'
                        : 'text-on-surface-variant hover:bg-white/[.06] hover:text-on-surface'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={item.icon} fill={isActive} className="text-[21px]" />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          <NavLink
            to="/settings"
            className="tap flex items-center gap-3 rounded-xl px-4 text-title text-on-surface-variant transition-colors duration-fast hover:bg-white/[.06]"
          >
            <Icon name="settings" className="text-[21px]" /> Settings
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="tap flex w-full items-center gap-3 rounded-xl px-4 text-title text-error transition-colors duration-fast hover:bg-error/10"
          >
            <Icon name="logout" className="text-[21px]" /> Log out
          </button>
        </div>
      </aside>
    </>
  )
}

function DemoDataBanner() {
  if (!runtimeConfig.isDemo) return null
  return (
    <div
      role="status"
      aria-label="Demo data"
      className="mb-4 flex items-start gap-3 rounded-xl border border-[#f7c948]/35 bg-[#f7c948]/10 px-4 py-3 text-left"
    >
      <Icon name="science" className="mt-0.5 shrink-0 text-[19px] text-[#f7c948]" />
      <div>
        <p className="text-label-md text-on-surface">{demoDataLabel}</p>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          Balances, payouts, deployments, rewards and any demo-only records are illustrative and are not live account
          data.
        </p>
      </div>
    </div>
  )
}

export default function AppShell({ title, subtitle, back, right, avatar = true, children, wide = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <Drawer open={drawerOpen} onClose={closeDrawer} />
      <div className="lg:pl-[288px]">
        <TopBar
          title={title}
          subtitle={subtitle}
          back={back}
          right={right}
          avatar={avatar}
          onMenu={() => setDrawerOpen(true)}
        />
        <main
          className={`mx-auto w-full px-margin-page pb-28 pt-4 lg:pb-16 ${wide ? 'max-w-[1080px]' : 'max-w-[720px]'}`}
        >
          <DemoDataBanner />
          <div className="space-y-7">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
