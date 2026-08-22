import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import { Icon, List, Row, SectionTitle } from '../components/ui.jsx'
import { packageDefinition } from '../domain/robot/packages.ts'

export default function More() {
  const auth = useAuth()
  const robotState = useRobot()
  const navigate = useNavigate()
  const accountLabel = auth.isDemo ? 'Demo account' : `Account ${auth.session?.userId?.slice(0, 8) || ''}`
  const packageLabel = robotState.robot ? packageDefinition(robotState.robot.packageSlug).name : 'No active robot'

  const groups = [
    {
      title: 'Robot',
      items: [
        { icon: 'model_training', t: 'primary', title: 'Train robot', subtitle: 'Training service', to: '/training' },
        { icon: 'dataset', t: 'tertiary', title: 'Add data', subtitle: 'Data contribution service', to: '/data' },
        {
          icon: 'badge',
          t: 'secondary',
          title: 'Robot passport',
          subtitle: 'Verified robot identity',
          to: '/robot/passport',
        },
        {
          icon: 'tune',
          t: 'primary',
          title: 'Customise robot',
          subtitle: 'Confirmed configuration',
          to: '/robot/customize',
        },
      ],
    },
    {
      title: 'Value',
      items: [
        {
          icon: 'account_balance_wallet',
          t: 'tertiary',
          title: 'Wallet & earnings',
          subtitle: 'Financial ledger service',
          to: '/wallet',
        },
        {
          icon: 'workspace_premium',
          t: 'secondary',
          title: 'Points & rewards',
          subtitle: 'Rewards service',
          to: '/rewards',
        },
        { icon: 'inventory_2', t: 'primary', title: 'Packages', subtitle: packageLabel, to: '/packages' },
        { icon: 'group_add', t: 'primary', title: 'Referrals', to: '/referrals' },
      ],
    },
    {
      title: 'Grow',
      items: [
        { icon: 'school', t: 'tertiary', title: 'Robot academy', to: '/academy' },
        { icon: 'groups', t: 'secondary', title: 'Community & events', to: '/community' },
        { icon: 'notifications', t: 'primary', title: 'Notifications', to: '/notifications' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person', t: 'outline', title: 'Profile', to: '/profile' },
        { icon: 'settings', t: 'outline', title: 'Settings', to: '/settings' },
        { icon: 'help_outline', t: 'outline', title: 'Support', to: '/support' },
      ],
    },
  ]

  const logout = async () => {
    await auth.logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell title="More" avatar={false}>
      <Link
        to="/profile"
        className="surface flex items-center gap-3.5 rounded-2xl p-4 transition-colors duration-fast hover:bg-white/[.04]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-container/35">
          <Icon name="person" className="text-on-surface" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-title text-on-surface">{accountLabel}</p>
          <p className="truncate font-data text-data-sm text-on-surface-variant">
            {auth.session?.userId || 'No verified session'}
          </p>
        </div>
        <Icon name="chevron_right" className="text-outline" />
      </Link>

      {groups.map((group) => (
        <section key={group.title}>
          <SectionTitle>{group.title}</SectionTitle>
          <List>
            {group.items.map((item) => (
              <Row key={item.title} {...item} />
            ))}
          </List>
        </section>
      ))}

      <button
        type="button"
        onClick={logout}
        className="tap flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 text-label-md text-error transition-colors duration-fast hover:bg-error/10"
      >
        <Icon name="logout" className="text-[18px]" /> Log out
      </button>
    </AppShell>
  )
}
