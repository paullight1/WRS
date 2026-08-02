import { Link } from 'react-router-dom'
import AppShell, { UserAvatar } from '../components/AppShell.jsx'
import { Icon, List, Row, SectionTitle } from '../components/ui.jsx'
import { user, robot } from '../data/mock.js'

/* Grouped settings-style lists: one container per group, hairline rows.
   Previously 14 separately-boxed cards, which read as noise. */
const groups = [
  {
    title: 'Robot',
    items: [
      { icon: 'model_training', t: 'primary', title: 'Train robot', subtitle: 'Voice, language, movement', to: '/training' },
      { icon: 'dataset', t: 'tertiary', title: 'Add data', subtitle: 'Contribute and earn XP', to: '/data' },
      { icon: 'badge', t: 'secondary', title: 'Robot passport', subtitle: 'Identity and work history', to: '/robot/passport' },
      { icon: 'tune', t: 'primary', title: 'Customise robot', subtitle: 'Appearance and personality', to: '/robot/customize' },
    ],
  },
  {
    title: 'Value',
    items: [
      { icon: 'account_balance_wallet', t: 'tertiary', title: 'Wallet & earnings', to: '/wallet' },
      { icon: 'workspace_premium', t: 'secondary', title: 'Points & rewards', to: '/rewards' },
      { icon: 'inventory_2', t: 'primary', title: 'Packages', subtitle: `Currently on ${robot.package}`, to: '/packages' },
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

export default function More() {
  return (
    <AppShell title="More" avatar={false}>
      <Link
        to="/profile"
        className="surface flex items-center gap-3.5 rounded-2xl p-4 transition-colors duration-fast hover:bg-white/[.04]"
      >
        <UserAvatar size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title text-on-surface">{user.name}</p>
          <p className="truncate font-data text-data-sm text-on-surface-variant">{user.wrsId}</p>
        </div>
        <Icon name="chevron_right" className="text-outline" />
      </Link>

      {groups.map((g) => (
        <section key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <List>
            {g.items.map((it) => (
              <Row key={it.title} {...it} />
            ))}
          </List>
        </section>
      ))}

      <Link
        to="/app"
        className="tap flex items-center justify-center gap-2 rounded-xl border border-white/12 text-label-md text-error transition-colors duration-fast hover:bg-error/10"
      >
        <Icon name="logout" className="text-[18px]" />
        Log out
      </Link>
    </AppShell>
  )
}
