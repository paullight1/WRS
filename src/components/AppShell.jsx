import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './ui.jsx'
import { user, robot } from '../data/mock.js'

/* --------------------------------------------------------------- atmosphere */
export function Atmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-[15%] -top-[10%] h-[55vh] w-[55vh] rounded-full bg-primary-container/20 blur-[140px]" />
      <div className="absolute -bottom-[15%] -right-[15%] h-[55vh] w-[55vh] rounded-full bg-tertiary/15 blur-[140px]" />
      <div className="absolute left-1/2 top-1/3 h-[40vh] w-[40vh] -translate-x-1/2 rounded-full bg-secondary-container/10 blur-[160px]" />
    </div>
  )
}

/* ------------------------------------------------------------------ avatar */
export function UserAvatar({ size = 40, className = '' }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('')
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 border-primary-container/50 bg-gradient-to-br from-primary-container/40 to-secondary-container/30 font-label-md text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------------ topbar */
export function TopBar({ title, back, subtitle, right, avatar, onMenu }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 px-margin-page py-3.5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-variant/30"
              aria-label="Go back"
            >
              <Icon name="arrow_back" className="text-on-surface-variant" />
            </button>
          ) : avatar ? (
            <Link to="/profile"><UserAvatar /></Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate font-headline-md text-[20px] font-bold tracking-tight text-on-surface">{title}</h1>
            {subtitle && <p className="truncate text-label-sm font-label-sm text-outline">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {right}
          <Link
            to="/notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface-variant/30"
            aria-label="Notifications"
          >
            <Icon name="notifications" className="text-primary" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-tertiary shadow-[0_0_8px_#00dbe7]" />
          </Link>
          {onMenu && (
            <button
              onClick={onMenu}
              className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface-variant/30 lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" className="text-on-surface-variant" />
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
  { to: '/robot', icon: 'smart_toy', label: 'My Robot' },
  { to: '/deploy', icon: 'rocket_launch', label: 'Deploy' },
  { to: '/marketplace', icon: 'storefront', label: 'Marketplace' },
  { to: '/more', icon: 'more_horiz', label: 'More' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-white/5 bg-surface-container-low/80 px-2 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_40px_rgba(0,219,231,.1)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-[560px] items-center justify-around">
        {bottomNav.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex w-[20%] flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95 ${
                isActive
                  ? 'text-tertiary drop-shadow-[0_0_8px_rgba(0,219,231,.6)]'
                  : 'text-outline hover:text-primary-fixed-dim'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={it.icon} fill={isActive} className="text-[24px]" />
                <span className="text-[10px] font-label-sm leading-tight">{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ drawer */
const drawerNav = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/robot', icon: 'smart_toy', label: 'My Robot' },
  { to: '/training', icon: 'model_training', label: 'Train Robot' },
  { to: '/data', icon: 'dataset', label: 'Add Data' },
  { to: '/deploy', icon: 'rocket_launch', label: 'Deployment' },
  { to: '/marketplace', icon: 'storefront', label: 'Marketplace' },
  { to: '/wallet', icon: 'account_balance_wallet', label: 'Wallet & Earnings' },
  { to: '/rewards', icon: 'workspace_premium', label: 'Points & Rewards' },
  { to: '/academy', icon: 'school', label: 'Robot Academy' },
  { to: '/community', icon: 'groups', label: 'Community / Events' },
  { to: '/referrals', icon: 'group_add', label: 'Referrals' },
  { to: '/support', icon: 'help_outline', label: 'Support' },
]

export function Drawer({ open, onClose }) {
  const loc = useLocation()
  useEffect(() => { onClose?.() }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* scrim (mobile) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[61] flex w-[300px] flex-col border-r border-white/10 bg-surface-container-lowest/95 py-6 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5">
          <Link to="/profile" className="glass flex items-center gap-3 rounded-2xl p-3">
            <UserAvatar size={44} />
            <div className="min-w-0">
              <p className="truncate font-label-md text-label-md font-bold text-on-surface">{user.name}</p>
              <p className="truncate text-label-sm font-label-sm text-outline">WRS ID: {user.wrsId}</p>
            </div>
          </Link>
        </div>

        <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto px-3 no-scrollbar">
          {drawerNav.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-body-md transition-all ${
                  isActive
                    ? 'border-l-2 border-primary bg-primary-container/20 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant/30'
                }`
              }
            >
              <Icon name={it.icon} className="text-[22px]" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 space-y-1 border-t border-white/5 px-3 pt-4">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-body-md text-on-surface-variant transition-all hover:bg-surface-variant/30"
          >
            <Icon name="settings" className="text-[22px]" />
            Settings
          </NavLink>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-body-md text-error transition-all hover:bg-error/10"
          >
            <Icon name="logout" className="text-[22px]" />
            Logout
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
      <Atmosphere />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="lg:pl-[300px]">
        <TopBar
          title={title}
          subtitle={subtitle}
          back={back}
          right={right}
          avatar={avatar}
          onMenu={() => setDrawerOpen(true)}
        />
        <main
          className={`mx-auto w-full px-margin-page pb-32 pt-6 lg:pb-16 ${wide ? 'max-w-[1080px]' : 'max-w-[720px]'}`}
        >
          <div key={loc.pathname} className="animate-riseIn space-y-section-gap">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

export { robot }
