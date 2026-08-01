import AppShell from '../components/AppShell.jsx'
import { Card, ListRow, SectionTitle } from '../components/ui.jsx'
import { UserAvatar } from '../components/AppShell.jsx'
import { Link } from 'react-router-dom'
import { user, robot } from '../data/mock.js'

const groups = [
  {
    title: 'Robot',
    items: [
      { icon: 'model_training', t: 'primary', title: 'Train Robot', subtitle: 'Voice, language, movement', to: '/training' },
      { icon: 'dataset', t: 'tertiary', title: 'Add Data', subtitle: 'Contribute and earn XP', to: '/data' },
      { icon: 'badge', t: 'secondary', title: 'Robot Passport', subtitle: 'Identity and history', to: '/robot/passport' },
      { icon: 'tune', t: 'primary', title: 'Customize Robot', subtitle: 'Appearance and personality', to: '/robot/customize' },
    ],
  },
  {
    title: 'Value',
    items: [
      { icon: 'account_balance_wallet', t: 'tertiary', title: 'Wallet & Earnings', subtitle: 'Balance and payouts', to: '/wallet' },
      { icon: 'workspace_premium', t: 'secondary', title: 'Points & Rewards', subtitle: 'XP, badges and boosts', to: '/rewards' },
      { icon: 'inventory_2', t: 'primary', title: 'Investment Packages', subtitle: 'Compare and upgrade', to: '/packages' },
      { icon: 'group_add', t: 'primary', title: 'Referrals', subtitle: 'Invite and earn', to: '/referrals' },
    ],
  },
  {
    title: 'Grow',
    items: [
      { icon: 'school', t: 'tertiary', title: 'Robot Academy', subtitle: 'Courses and certificates', to: '/academy' },
      { icon: 'groups', t: 'secondary', title: 'Community & Events', subtitle: 'Meetings and challenges', to: '/community' },
      { icon: 'notifications', t: 'primary', title: 'Notifications', subtitle: 'All activity', to: '/notifications' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person', t: 'primary', title: 'Profile', subtitle: 'Your WRS identity', to: '/profile' },
      { icon: 'settings', t: 'outline', title: 'Settings', subtitle: 'Account and robot controls', to: '/settings' },
      { icon: 'help_outline', t: 'outline', title: 'Support', subtitle: 'Help and tickets', to: '/support' },
    ],
  },
]

export default function More() {
  return (
    <AppShell title="More" avatar={false}>
      <Link to="/profile">
        <Card className="flex items-center gap-4 p-card-padding transition-all hover:border-white/20">
          <UserAvatar size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-headline-md text-[18px] text-on-surface">{user.name}</p>
            <p className="truncate text-label-sm font-label-sm text-outline">
              WRS ID: {user.wrsId} · {robot.package}
            </p>
          </div>
        </Card>
      </Link>

      {groups.map((g) => (
        <section key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <div className="space-y-2">
            {g.items.map((it) => (
              <ListRow key={it.title} {...it} />
            ))}
          </div>
        </section>
      ))}

      <Link
        to="/"
        className="glass flex items-center justify-center gap-2 rounded-2xl p-4 text-label-md font-label-md text-error transition-all hover:bg-error/10"
      >
        Logout
      </Link>
    </AppShell>
  )
}
