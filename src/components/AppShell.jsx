import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './ui.jsx'
import { user, robot } from '../data/mock.js'

/** Retired: the page background is a flat surface now. Kept as a no-op so
 *  auth screens that still import it don't need touching. */
export function Atmosphere() {
  return null
}

/* ------------------------------------------------------------------ avatar */
export function UserAvatar({ size = 40, className = '' }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('')
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-primary-container/35 text-label-md text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------------ topbar */
export function TopBar({ title, back, subtitle, right, avatar, onMenu }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  // The header only grows a hairline once content passes under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
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
            className="tap relative grid place-items-center rounded-full transition-colors duration-fast hover:bg-white/[.06]"
            aria-label="Notifications, 3 unread"
          >
            <Icon name="notifications" className="text-on-surface" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-background bg-tertiary" />
          </Link>
          {onMenu && (
            <button
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

/* -------------------------------------------------------------- bottom nav */
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
        {bottomNav.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              className={({ isActive }) =>
                `tap flex w-full flex-col items-center justify-center gap-1 py-0.5 transition-colors duration-fast ${
                  isActive ? 'text-primary' : 'text-outline'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active state: filled pill + filled glyph + weight.
                      No rules, and never colour on its own. */}
                  <span
                    className={`grid h-8 w-16 place-items-center rounded-full transition-colors duration-fast ${
                      isActive ? 'bg-primary-container/30' : ''
                    }`}
                  >
                    <Icon name={it.icon} fill={isActive} className="text-[22px]" />
                  </span>
                  <span className={`text-[11px] leading-tight ${isActive ? 'font-semibold' : ''}`}>{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ------------------------------------------------------------------ drawer */
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

export function Drawer({ open, onClose }) {
  const loc = useLocation()
  useEffect(() => { onClose?.() }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trap escape + lock scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-scrim bg-black/60 transition-opacity duration-slow lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        aria-label="Sections"
        aria-hidden={!open || undefined}
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
              <span className="block truncate text-title text-on-surface">{user.name}</span>
              <span className="block truncate font-data text-data-sm text-on-surface-variant">{user.wrsId}</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
          {drawerGroups.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="px-4 pb-1.5 text-label-sm text-outline">{g.label}</p>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
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
                      <Icon name={it.icon} fill={isActive} className="text-[21px]" />
                      <span>{it.label}</span>
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
            <Icon name="settings" className="text-[21px]" />
            Settings
          </NavLink>
          <Link
            to="/app"
            className="tap flex items-center gap-3 rounded-xl px-4 text-title text-error transition-colors duration-fast hover:bg-error/10"
          >
            <Icon name="logout" className="text-[21px]" />
            Log out
          </Link>
        </div>
      </aside>
    </>
  )
}

/* ------------------------------------------------------------------- shell */
export default function AppShell({ title, subtitle, back, right, avatar = true, children, wide = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [loc.pathname])

  return (
    <div className="min-h-screen">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="lg:pl-[288px]">
        <TopBar
          title={title}
          subtitle={subtitle}
          back={back}
          right={right}
          avatar={avatar}
          onMenu={() => setDrawerOpen(true)}
        />
        {/* No page-load choreography: product loads into a task. */}
        <main className={`mx-auto w-full px-margin-page pb-28 pt-4 lg:pb-16 ${wide ? 'max-w-[1080px]' : 'max-w-[720px]'}`}>
          <div className="space-y-7">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

export { robot }
