import { useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ActionIcon, Avatar, Drawer, Menu } from '@mantine/core'
import wrsLogo from '../../../public/wrs-logo-footer.png'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'
import { useAdminTheme } from '../theme/AdminThemeProvider.jsx'
import { securitySettingsUrl } from '../lib/externalRoutes.js'

const NAV = [
  ['overview', 'Overview', 'dashboard'], ['users', 'Users & KYC', 'group'], ['support', 'Support', 'support_agent'],
  ['finance', 'Finance', 'account_balance'], ['deployments', 'Deployments', 'rocket_launch'],
  ['data', 'Data review', 'dataset'], ['risk', 'Trust & safety', 'shield'], ['rewards', 'Rewards', 'workspace_premium'],
  ['access', 'Operator access', 'admin_panel_settings'],
]
const ROLE_SCOPE = {
  support_operator: ['overview', 'support'], kyc_operator: ['overview', 'users'],
  finance_operator: ['overview', 'finance'], data_operator: ['overview', 'data'],
  deployment_operator: ['overview', 'deployments'], risk_operator: ['overview', 'risk'], reward_operator: ['overview', 'rewards'],
}

export default function AdminShell({ children, title = 'Operations' }) {
  const auth = useAuth()
  const { theme, toggleTheme } = useAdminTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const scopes = useMemo(() => {
    const roles = auth.session?.roles || []
    const allowed = roles.includes('admin') ? NAV.map(([key]) => key) : [...new Set(roles.flatMap((role) => ROLE_SCOPE[role] || []))]
    return NAV.filter(([key]) => allowed.includes(key))
  }, [auth.session?.roles])
  const requestedScope = new URLSearchParams(location.search).get('scope')
  const active = scopes.some(([scope]) => scope === requestedScope) ? requestedScope : scopes[0]?.[0]
  const email = auth.session?.email || 'Operator account'
  const roles = (auth.session?.roles || []).filter((role) => role !== 'user')
  const logout = async () => { await auth.logout(); navigate('/login', { replace: true }) }
  const toggleLabel = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
  const themeControl = (
    <button type="button" className="admin-theme-row" onClick={toggleTheme}>
      <span className="material-symbols-outlined" aria-hidden="true">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
      <span>{toggleLabel}</span>
    </button>
  )
  const mobileNavigation = (
    <>
      <div className="admin-drawer-caption">Workspace</div>
      <nav aria-label="Operator scopes" className="admin-drawer-nav">
        {scopes.map(([scope, label, icon]) => (
          <NavLink
            key={scope}
            to={`/?scope=${scope}`}
            aria-current={active === scope ? 'page' : undefined}
            className={`admin-nav-item ${active === scope ? 'is-active' : ''}`}
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="admin-drawer-bottom">
        <a className="admin-security-link" href={securitySettingsUrl}>Security settings</a>
        {themeControl}
      </div>
    </>
  )

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <ActionIcon
            className="admin-mobile-menu-button"
            variant="default"
            size="md"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">menu</span>
          </ActionIcon>
          <img className="admin-brand-logo" src={wrsLogo} alt="World Robotic System" />
          <span><strong>WRS Console</strong><small>Administration</small></span>
          <span className="admin-secure-indicator admin-brand-secure-indicator"><i />Secure session</span>
        </div>
        <div className="admin-nav-caption">Workspace</div>
        <nav aria-label="Operator scopes" className="admin-sidebar-nav">
          {scopes.map(([scope, label, icon]) => (
            <NavLink
              key={scope}
              to={`/?scope=${scope}`}
              aria-current={active === scope ? 'page' : undefined}
              className={`admin-nav-item ${active === scope ? 'is-active' : ''}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a className="admin-security-link" href={securitySettingsUrl}>Security settings</a>
          {themeControl}
        </div>
      </aside>
      <Drawer
        id="admin-mobile-navigation"
        className="admin-mobile-drawer"
        opened={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        position="left"
        size={290}
        title={<span className="admin-drawer-title"><img className="admin-brand-logo" src={wrsLogo} alt="" />WRS Console</span>}
        overlayProps={{ backgroundOpacity: 0.58, blur: 1 }}
        withinPortal={false}
        zIndex={100}
      >
        {mobileNavigation}
      </Drawer>
      <main className="admin-main">
        <header className="admin-topbar">
          <div><div className="admin-crumb">WRS / Operations</div><h1>{title}</h1></div>
          <div className="admin-top-actions">
            <span className="admin-secure-indicator admin-topbar-secure-indicator"><i />Secure session</span>
            <Menu position="bottom-end" shadow="md" withinPortal={false} closeOnItemClick>
              <Menu.Target>
                <button type="button" className="admin-profile-trigger" aria-label="Open operator profile">
                  <Avatar radius="xl" color="indigo">{String(email[0] || 'O').toUpperCase()}</Avatar>
                </button>
              </Menu.Target>
              <Menu.Dropdown className="admin-profile-menu">
                <Menu.Label>
                  <span className="admin-profile-menu-email">{email}</span>
                  <span className="admin-profile-menu-roles">{roles.length ? roles.join(' · ') : 'Operator'}</span>
                </Menu.Label>
                <Menu.Item
                  component="a"
                  href={securitySettingsUrl}
                  leftSection={<span className="material-symbols-outlined" aria-hidden="true">security</span>}
                >
                  Security settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<span className="material-symbols-outlined" aria-hidden="true">logout</span>}
                  onClick={logout}
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </header>
        <div className="admin-page-content">{children}</div>
      </main>
    </div>
  )
}
