import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import wrsLogo from '../../../public/wrs-logo-footer.png'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'
import { useAdminTheme } from '../theme/AdminThemeProvider.jsx'
import { securitySettingsUrl } from '../lib/externalRoutes.js'
import { areasForRoles } from '../lib/operations.js'

const roleName = (role) =>
  ({
    admin: 'Administrator',
    support_operator: 'Support',
    kyc_operator: 'Identity checks',
    finance_operator: 'Money',
    deployment_operator: 'Jobs',
    data_operator: 'Data reviews',
    risk_operator: 'Community reviews',
    reward_operator: 'Rewards',
  })[role] || 'Team member'
export default function AdminShell({ children, title = 'Admin', subtitle, actions, showPageHeader = true }) {
  const auth = useAuth()
  const { theme, toggleTheme } = useAdminTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const drawer = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const areas = useMemo(() => areasForRoles(auth.session?.roles), [auth.session?.roles])
  const params = new URLSearchParams(location.search)
  const active = areas.find(({ key }) => key === params.get('scope')) || areas[0]
  const activePage = active?.groups?.find(([key]) => key === params.get('page'))?.[0] || active?.groups?.[0][0]
  const email = auth.session?.email || 'My account'
  const displayName = auth.session?.fullName || email
  const initial = auth.session?.fullName?.[0] || auth.session?.email?.[0]
  const roles = (auth.session?.roles || []).filter((role) => role !== 'user')
  const closeNav = () => drawer.current?.close()
  async function logout() {
    try {
      await auth.logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error.message || 'Sign out failed. Try again.')
    }
  }
  const pageLink = (area, key, label, mobile) => {
    const selected = active?.key === area.key && (!key || key === activePage)
    return (
      <Link
        key={key || area.key}
        to={`${location.pathname}?scope=${area.key}${key ? `&page=${key}` : ''}`}
        aria-current={selected ? 'page' : undefined}
        className={`admin-nav-item ${selected ? 'is-active' : ''}`}
        onClick={mobile ? closeNav : undefined}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {key === 'identity' ? 'verified_user' : area.icon}
        </span>
        <span>{label}</span>
      </Link>
    )
  }
  const navigation = (mobile = false) => (
    <nav aria-label="Admin pages" className={mobile ? 'admin-drawer-nav' : 'admin-sidebar-nav'}>
      {areas.map((area) =>
        area.groups?.length > 1 && area.key !== 'users' ? (
          <details key={area.key} className="admin-nav-section" open={active?.key === area.key}>
            <summary>
              <span className="material-symbols-outlined" aria-hidden="true">
                {area.icon}
              </span>
              {area.label}
              <span className="admin-nav-chevron" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div>{area.groups.map(([key, label]) => pageLink(area, key, label, mobile))}</div>
          </details>
        ) : area.key === 'users' ? (
          <div key={area.key}>{area.groups.map(([key, label]) => pageLink(area, key, label, mobile))}</div>
        ) : (
          pageLink(area, area.groups?.[0][0], area.label, mobile)
        ),
      )}
    </nav>
  )
  const preferences = (
    <button type="button" className="admin-theme-row" onClick={toggleTheme}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {theme === 'light' ? 'dark_mode' : 'light_mode'}
      </span>
      <span>{theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}</span>
    </button>
  )
  return (
    <div className="admin-layout">
      <header className="admin-global-header">
        <div className="admin-brand">
          <button
            type="button"
            className="admin-mobile-menu-button"
            aria-label={mobileNavOpen ? 'Close admin navigation' : 'Open admin navigation'}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-navigation"
            onClick={() => {
              drawer.current?.showModal()
              setMobileNavOpen(true)
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              menu
            </span>
          </button>
          <img className="admin-brand-logo" src={wrsLogo} alt="World Robotic System" />
          <strong>Admin</strong>
        </div>
        <details className="admin-account-menu">
          <summary className="admin-profile-trigger" aria-label="Open my account">
            <span className="admin-avatar">
              {initial ? (
                initial.toUpperCase()
              ) : (
                <span className="material-symbols-outlined" aria-hidden="true">
                  person
                </span>
              )}
            </span>
          </summary>
          <div className="admin-profile-menu">
            <strong className="admin-profile-menu-email">{displayName}</strong>
            {auth.session?.fullName && auth.session?.email && <span className="admin-muted">{auth.session.email}</span>}
            <span className="admin-profile-menu-roles">
              {roles.length ? roles.map(roleName).join(' · ') : 'Team member'}
            </span>
            <a href={securitySettingsUrl}>Security settings</a>
            <button onClick={logout}>Sign out</button>
            {logoutError && (
              <p role="alert" className="admin-error">
                {logoutError}
              </p>
            )}
          </div>
        </details>
      </header>
      <aside className="admin-sidebar">
        {navigation()}
        <div className="admin-sidebar-bottom">{preferences}</div>
      </aside>
      <dialog
        ref={drawer}
        id="admin-mobile-navigation"
        className="admin-native-drawer"
        aria-label="Admin navigation"
        onClose={() => setMobileNavOpen(false)}
      >
        <div className="admin-native-drawer-heading">
          <img className="admin-brand-logo" src={wrsLogo} alt="World Robotic System" />
          <strong>Admin</strong>
          <button className="admin-btn admin-btn-small" onClick={closeNav} aria-label="Close admin navigation">
            Close
          </button>
        </div>
        {navigation(true)}
        <div className="admin-drawer-bottom">{preferences}</div>
      </dialog>
      <main className="admin-main">
        {showPageHeader && (
          <div className="admin-topbar">
            <div className="admin-topbar-copy">
              <h1>{title}</h1>
              {subtitle && <p className="admin-topbar-subtitle">{subtitle}</p>}
            </div>
            {actions}
          </div>
        )}
        <div className="admin-page-content">{children}</div>
      </main>
    </div>
  )
}
